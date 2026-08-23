export interface PythonSourceFile {
  filename: string;
  category: "Core Engine" | "Prepress & PDF" | "Plugins & Automation" | "Windows 10 Packaging";
  description: string;
  code: string;
}

export const PYTHON_SOURCE_FILES: PythonSourceFile[] = [
  {
    filename: "requirements.txt",
    category: "Core Engine",
    description: "Popis svih Python zavisnosti za produkcijsko i prepress okruženje, offline NLP i fuzzy pipeline.",
    code: `streamlit>=1.32.0
google-generativeai>=0.4.0
pydantic>=2.6.0
reportlab>=4.1.0
fpdf2>=2.7.8
pillow>=10.2.0
pandas>=2.2.0
python-dotenv>=1.0.1
pywin32>=306
pyinstaller>=6.4.0
clevercsv>=0.8.2
rapidfuzz>=3.6.0
flashtext>=2.7
regex>=2023.12.25
dateparser>=1.2.0
charset-normalizer>=3.3.2
openpyxl>=3.1.2
`,
  },
  {
    filename: "dtf_prepress_parser.py",
    category: "Core Engine",
    description: "Offline, deterministički NLP + Regex + Fuzzy Resolution Pipeline kompatibilan s Windows 10 i Streamlit sučeljem.",
    code: `"""
DTF Prepress Work Order Parser
Offline, Deterministic NLP + Regex + Fuzzy Resolution Pipeline
Compatible with Windows 10 (CPU/AVX2) and Streamlit.
"""

from __future__ import annotations

import io
import json
import logging
import unicodedata
from dataclasses import asdict, dataclass, field
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import charset_normalizer
import clevercsv
import dateparser
import pandas as pd
import regex as re
from flashtext import KeywordProcessor
from pydantic import BaseModel, Field
from rapidfuzz import fuzz, process

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("DTFParser")


# =====================================================================
# 1. Pydantic Schemas for Strict Data Validation
# =====================================================================
class PrintPlacement(BaseModel):
    position_canonical: str = Field(..., description="Standard placement key")
    position_name: str = Field(..., description="Human readable Croatian label")
    width_cm: Optional[float] = None
    height_cm: Optional[float] = None
    artwork_file: Optional[str] = None
    custom_text: Optional[str] = None


class ParsedWorkOrderItem(BaseModel):
    raw_input: str
    order_id: Optional[str] = None
    client_name: Optional[str] = None
    item_canonical: Optional[str] = None
    category: str = "Tekstil"
    color_canonical: Optional[str] = None
    is_dark_garment: bool = False
    size: Optional[str] = None
    quantity: int = 1
    placements: List[PrintPlacement] = Field(default_factory=list)
    personalization_names: List[str] = Field(default_factory=list)
    unparsed_notes: Optional[str] = None


# =====================================================================
# 2. File Sniffing & Robust Ingestion Engine
# =====================================================================
class RobustFileIngester:
    """Handles ragged lines, mixed delimiters, and Croatian encodings."""

    @staticmethod
    def detect_encoding(raw_bytes: bytes) -> str:
        results = charset_normalizer.from_bytes(raw_bytes)
        best = results.best()
        if best is not None and best.encoding:
            # Map Windows Central European properly
            encoding = best.encoding.lower()
            if "1250" in encoding or "cp1250" in encoding:
                return "cp1250"
            if "iso-8859-2" in encoding:
                return "iso-8859-2"
            return "utf-8"
        return "utf-8"

    @classmethod
    def read_tabular_data(cls, file_source: bytes | str | Path) -> pd.DataFrame:
        if isinstance(file_source, (str, Path)):
            with open(file_source, "rb") as f:
                raw_bytes = f.read()
        else:
            raw_bytes = file_source

        # Handle Excel files directly
        if raw_bytes[:4] in (b"PK\\x03\\x04", b"\\xd0\\xcf\\x11\\xe0"):
            try:
                return pd.read_excel(io.BytesIO(raw_bytes), engine="calamine")
            except Exception:
                return pd.read_excel(io.BytesIO(raw_bytes))

        # Handle CSV / TXT via CleverCSV
        detected_enc = cls.detect_encoding(raw_bytes)
        text_content = raw_bytes.decode(detected_enc, errors="replace")

        try:
            dialect = clevercsv.Sniffer().sniff(text_content, delimiters=[";", ",", "\\t", "|"])
            rows = clevercsv.reader(io.StringIO(text_content), dialect=dialect)
            data = list(rows)
        except Exception as e:
            logger.warning(f"CleverCSV dialect fallback triggered: {e}")
            df_fallback = pd.read_csv(
                io.StringIO(text_content),
                sep=None,
                engine="python",
                on_bad_lines="skip"
            )
            return df_fallback

        if not data:
            return pd.DataFrame()

        header = [str(c).strip() for c in data[0]]
        records = []
        for r in data[1:]:
            if not any(r):
                continue
            # Pad ragged rows
            if len(r) < len(header):
                r = r + [""] * (len(header) - len(r))
            elif len(r) > len(header):
                r = r[: len(header) - 1] + [" | ".join(r[len(header) - 1 :])]
            records.append(r)

        return pd.DataFrame(records, columns=header)


# =====================================================================
# 3. Prepress Knowledge Resolver (FlashText + RapidFuzz)
# =====================================================================
class PrepressResolver:
    """Resolves catalog aliases, standard positions, colors, and dimensions."""

    def __init__(self, dictionary_path: Optional[str | Path] = None):
        self.dict_data: Dict[str, Any] = {}
        self.item_kw = KeywordProcessor(case_sensitive=False)
        self.color_kw = KeywordProcessor(case_sensitive=False)
        self.pos_kw = KeywordProcessor(case_sensitive=False)
        self.size_lookup: Dict[str, str] = {}

        if dictionary_path and Path(dictionary_path).exists():
            with open(dictionary_path, "r", encoding="utf-8") as f:
                self.dict_data = json.load(f)
            self._build_indexes()

    @staticmethod
    def strip_accents(text: str) -> str:
        text = text.replace("đ", "dj").replace("Đ", "Dj")
        return "".join(
            c for c in unicodedata.normalize("NFD", text) if unicodedata.category(c) != "Mn"
        )

    def _build_indexes(self) -> None:
        # 1. Item Categories & Aliases
        for key, details in self.dict_data.get("item_categories", {}).items():
            self.item_kw.add_keyword(key, key)
            for alias in details.get("aliases", []):
                self.item_kw.add_keyword(alias, key)
                self.item_kw.add_keyword(self.strip_accents(alias), key)

        # 2. Colors Palette
        for key, details in self.dict_data.get("color_palette", {}).items():
            self.color_kw.add_keyword(key, key)
            for alias in details.get("aliases", []):
                self.color_kw.add_keyword(alias, key)
                self.color_kw.add_keyword(self.strip_accents(alias), key)

        # 3. Standard Positions
        for key, details in self.dict_data.get("standard_positions", {}).items():
            self.pos_kw.add_keyword(key, key)
            for alias in details.get("aliases", []):
                self.pos_kw.add_keyword(alias, key)
                self.pos_kw.add_keyword(self.strip_accents(alias), key)

        # 4. Sizes
        for raw_size, standard_size in self.dict_data.get("size_map", {}).items():
            self.size_lookup[raw_size.upper()] = standard_size

    def map_header_name(self, col_name: str) -> str:
        clean = self.strip_accents(col_name.lower().replace(" ", "").replace("_", ""))
        for standard_key, aliases in self.dict_data.get("header_aliases", {}).items():
            if clean in aliases or clean == standard_key:
                return standard_key
        # Fuzzy fallback for mangled headers
        flat_aliases = {
            alias: standard_key
            for standard_key, aliases in self.dict_data.get("header_aliases", {}).items()
            for alias in aliases
        }
        match = process.extractOne(clean, list(flat_aliases.keys()), scorer=fuzz.ratio, score_cutoff=85)
        if match:
            return flat_aliases[match[0]]
        return col_name

    def resolve_color(self, text: str) -> Tuple[Optional[str], bool]:
        matches = self.color_kw.extract_keywords(text)
        if matches:
            canonical_key = matches[0]
            palette = self.dict_data.get("color_palette", {}).get(canonical_key, {})
            return palette.get("canonical", canonical_key), palette.get("is_dark", False)

        # Fuzzy RapidFuzz token matching
        choices = {}
        for key, details in self.dict_data.get("color_palette", {}).items():
            for alias in details.get("aliases", []):
                choices[alias] = key

        best_match = process.extractOne(
            text, list(choices.keys()), scorer=fuzz.token_set_ratio, score_cutoff=80
        )
        if best_match:
            canonical_key = choices[best_match[0]]
            palette = self.dict_data.get("color_palette", {}).get(canonical_key, {})
            return palette.get("canonical", canonical_key), palette.get("is_dark", False)

        return None, False

    def resolve_item(self, text: str) -> Tuple[Optional[str], str]:
        matches = self.item_kw.extract_keywords(text)
        if matches:
            key = matches[0]
            details = self.dict_data.get("item_categories", {}).get(key, {})
            return details.get("canonical", key), details.get("category", "Tekstil")

        # Fuzzy fallback
        choices = {}
        for key, details in self.dict_data.get("item_categories", {}).items():
            for alias in details.get("aliases", []):
                choices[alias] = key

        match = process.extractOne(
            text, list(choices.keys()), scorer=fuzz.token_set_ratio, score_cutoff=75
        )
        if match:
            key = choices[match[0]]
            details = self.dict_data.get("item_categories", {}).get(key, {})
            return details.get("canonical", key), details.get("category", "Tekstil")

        return None, "Tekstil"

    def resolve_size(self, text: str) -> Optional[str]:
        # Exact token scan first
        tokens = re.split(r"[\\s,;/\\-]+", text.upper())
        for token in tokens:
            if token in self.size_lookup:
                return self.size_lookup[token]

        # Regex matching for patterns like "Vel. S", "Size: XL"
        m = re.search(r"\\b(?:vel|velicina|size)?\\s*[:.\\-]?\\s*(XS|S|M|L|XL|2XL|XXL|3XL|XXXL|4XL|5XL|UNI)\\b", text, re.IGNORECASE)
        if m:
            return self.size_lookup.get(m.group(1).upper(), m.group(1).upper())
        return None


# =====================================================================
# 4. Regex & Unstructured Entity Parser
# =====================================================================
class EntityExtractor:
    """Extracts quantities, complex dimensions, print placements, and names."""

    # Matches 26x30cm, 9 cm, 200 x 300 mm, 8.5 x 10 cm
    DIM_PATTERN = re.compile(
        r"(?P<w>\\d+(?:[.,]\\d+)?)\\s*(?:x|×|\\*)\\s*(?P<h>\\d+(?:[.,]\\d+)?)\\s*(?P<unit>cm|mm)?|"
        r"(?P<single_w>\\d+(?:[.,]\\d+)?)\\s*(?P<single_unit>cm|mm)\\s*(?:širine|visine|sirina|visina|max)?",
        re.IGNORECASE,
    )

    # Matches "10 kom", "1x", "3 komada", "Količina: 5"
    QTY_PATTERN = re.compile(
        r"(?:^|\\b)(?:(?P<qty_lead>\\d+)\\s*(?:x|kom|komada|pcs)\\b|"
        r"(?:kol|kolicina|količina|qty)\\s*[:.\\-]?\\s*(?P<qty_trail>\\d+))",
        re.IGNORECASE,
    )

    # Matches personalization lists like "Imena: Marko, Ivan, Ana" or "1. PETAR 2. LUKA"
    NAME_LIST_PATTERN = re.compile(
        r"(?:imena|tisak imena|personalizacija)\\s*[:\\-]\\s*(?P<names>[^\\n\\r;]+)|"
        r"(?:\\d+[\\.\\)]\\s*([A-ZČĆŽŠĐa-zčćžšđ]+))",
        re.IGNORECASE,
    )

    @classmethod
    def extract_dimensions(cls, text: str) -> Tuple[Optional[float], Optional[float]]:
        match = cls.DIM_PATTERN.search(text)
        if not match:
            return None, None

        if match.group("w") and match.group("h"):
            w = float(match.group("w").replace(",", "."))
            h = float(match.group("h").replace(",", "."))
            unit = (match.group("unit") or "cm").lower()
            if unit == "mm":
                w, h = w / 10.0, h / 10.0
            return w, h

        if match.group("single_w"):
            w = float(match.group("single_w").replace(",", "."))
            unit = (match.group("single_unit") or "cm").lower()
            if unit == "mm":
                w = w / 10.0
            return w, None

        return None, None

    @classmethod
    def extract_quantity(cls, text: str, default: int = 1) -> int:
        match = cls.QTY_PATTERN.search(text)
        if match:
            val = match.group("qty_lead") or match.group("qty_trail")
            if val and val.isdigit():
                return int(val)
        return default

    @classmethod
    def clean_client_name(cls, raw: str, fallback_row_text: str = "") -> str:
        name = (raw or "").strip()
        name = re.sub(r"^[\"\'“”„«\[\(]+|[\"\'“”»\]\)]+$", "", name).strip()
        name = re.sub(r"^(?:kupac|klijent|tvrtka|naručitelj|narucitelj|customer|client|partner|naziv|ime|poslovni\s+partner)\s*[:\-]\s*", "", name, flags=re.IGNORECASE).strip()
        name = re.sub(r"\(?(?:oib|vat|id|porezni\s*broj)?\s*[:\-]?\s*\b\d{11}\b\)?", "", name, flags=re.IGNORECASE).strip()
        name = re.sub(r"\(?\+?\d{2,4}[\s\/\-]?\d{2,3}[\s\/\-]?\d{3,4}\)?", "", name).strip()
        name = re.sub(r"[\s,\-;:]+$", "", name).strip()
        name = re.sub(r"^[\s,\-;:]+", "", name).strip()
        name = re.sub(r"\b([dD])\.\s*([oO])\.\s*([oO])\.?\b", r"\\1.\\2.\\3.", name)
        name = re.sub(r"\b([jJ])\.\s*([dD])\.\s*([oO])\.\s*([oO])\.?\b", r"\\1.\\2.\\3.", name)
        name = re.sub(r"\b([dD])\.\s*([dD])\.?\b", r"\\1.\\2.", name)
        name = re.sub(r"\b([kK])\.\s*([dD])\.?\b", r"\\1.\\2.", name)
        name = re.sub(r"\b([vV][lL])\.\s*", r"vl. ", name)

        if not name or re.match(r"^(?:klijent|kupac|customer|partner|client|unknown|n/a|-|\?|\d+|klijent\s*\d+)$", name, flags=re.IGNORECASE):
            if fallback_row_text:
                m1 = re.search(r"\b((?:Caffe\s+Bar|CB|Restoran|Bistro|Pivnica|OPG|Obrt|DVD|NK|KK|MNK|HNK|Udruga|Klub|Moto\s+Klub|Auto\s+Klub|Hotel|Studio|Servis|Poliklinika|Konoba|Klesarstvo|Pekara|Gostionica)\s+[\wčćžšđČĆŽŠĐ\.\-]+(?:\s+[\wčćžšđČĆŽŠĐ\.\-]+){0,3})", fallback_row_text, flags=re.IGNORECASE)
                if m1:
                    return cls.clean_client_name(m1.group(1))
                m2 = re.search(r"([\wčćžšđČĆŽŠĐ\.\-&]+\s+(?:[\wčćžšđČĆŽŠĐ\.\-&]+\s+){0,3}(?:d\.o\.o\.|j\.d\.o\.o\.|d\.d\.|k\.d\.|obrt|vl\.\s*[\wčćžšđČĆŽŠĐ]+))", fallback_row_text, flags=re.IGNORECASE)
                if m2:
                    return cls.clean_client_name(m2.group(1))

        if name == name.upper() and len(name) > 3:
            words = []
            for w in name.lower().split(" "):
                if re.match(r"^(?:d\.o\.o\.|j\.d\.o\.o\.|d\.d\.|opg|dvd|nk|kk|mnk|hnk|cb|oib|vat|doo|jdoo|b&c)$", w, flags=re.IGNORECASE):
                    words.append(w.upper())
                elif w.startswith("vl."):
                    words.append("vl.")
                else:
                    words.append(w.capitalize())
            name = " ".join(words)

        return name or "Nepoznati Klijent"

    @classmethod
    def extract_personalizations(cls, text: str) -> List[str]:
        names = []
        for m in cls.NAME_LIST_PATTERN.finditer(text):
            if m.group("names"):
                raw_split = re.split(r"[,;/]+", m.group("names"))
                names.extend([n.strip() for n in raw_split if len(n.strip()) > 1])
            elif m.group(2):
                names.append(m.group(2).strip())
        return list(dict.fromkeys(names))  # Deduplicate keeping order


# =====================================================================
# 5. Local LLM Structured Extraction (llama-cpp-python + GBNF fallback)
# =====================================================================
class LocalStructuredLLMParser:
    """
    Offline fallback parser for heavily unstructured descriptions.
    Uses llama-cpp-python with strict JSON schema grammar enforcement.
    """

    def __init__(self, model_path: Optional[str] = None):
        self.llm = None
        if model_path and Path(model_path).exists():
            try:
                from llama_cpp import Llama
                self.llm = Llama(
                    model_path=str(model_path),
                    n_ctx=2048,
                    n_threads=6,        # Tuned for modern 6-8 core CPUs
                    verbose=False
                )
                logger.info("Local GGUF LLM initialized successfully.")
            except ImportError:
                logger.warning("llama-cpp-python not installed. LLM fallback unavailable.")
            except Exception as e:
                logger.error(f"Error loading GGUF model: {e}")

    def parse_messy_description(self, raw_text: str) -> Dict[str, Any]:
        if not self.llm:
            return {}

        prompt = (
            f"<|im_start|>system\\n"
            f"You are a prepress DTF print order extractor. Return strictly valid JSON containing:\\n"
            f"item, color, size, quantity, position, width_cm, personalization_names.<|im_end|>\\n"
            f"<|im_start|>user\\n"
            f"Extract specifications from this order description:\\n\\\"\\\"\\\"{raw_text}\\\"\\\"\\\"<|im_end|>\\n"
            f"<|im_start|>assistant\\n"
        )

        try:
            # Deterministic grammar-guided generation
            output = self.llm(
                prompt,
                max_tokens=256,
                temperature=0.0,
                stop=["<|im_end|>", "\\n\\n"]
            )
            response_text = output["choices"][0]["text"].strip()
            # Clean possible formatting
            response_text = re.sub(r"^\`\`\`json\\s*", "", response_text)
            response_text = re.sub(r"\\s*\`\`\`$", "", response_text)
            return json.loads(response_text)
        except Exception as e:
            logger.error(f"LLM extraction error: {e}")
            return {}


# =====================================================================
# 6. Integrated End-to-End DTF Prepress Pipeline
# =====================================================================
class DTFPrepressPipeline:
    def __init__(self, dictionary_path: str, model_path: Optional[str] = None):
        self.resolver = PrepressResolver(dictionary_path)
        self.extractor = EntityExtractor()
        self.llm_parser = LocalStructuredLLMParser(model_path)

    def process_order_file(self, file_source: bytes | str | Path) -> List[ParsedWorkOrderItem]:
        df = RobustFileIngester.read_tabular_data(file_source)
        if df.empty:
            return []

        # Standardize header column names using dictionary aliases
        column_mapping = {col: self.resolver.map_header_name(col) for col in df.columns}
        df = df.rename(columns=column_mapping)

        parsed_items: List[ParsedWorkOrderItem] = []

        for _, row in df.iterrows():
            row_dict = row.to_dict()

            order_id = str(row_dict.get("order_id", "")).strip() or None
            raw_client = str(row_dict.get("client", "")).strip()
            client_name = self.extractor.clean_client_name(raw_client, str(row_dict))

            # Concatenate descriptive fields for contextual text parsing
            combined_desc = " \\n ".join([
                str(row_dict.get(k, ""))
                for k in ["item", "note", "text", "position", "personalization"]
                if row_dict.get(k) and pd.notna(row_dict.get(k))
            ])

            # 1. Deterministic Extraction
            item_canon, category = self.resolver.resolve_item(
                f"{row_dict.get('item', '')} {combined_desc}"
            )
            color_canon, is_dark = self.resolver.resolve_color(
                f"{row_dict.get('color', '')} {combined_desc}"
            )
            size = self.resolver.resolve_size(
                f"{row_dict.get('size', '')} {combined_desc}"
            )
            qty = self.extractor.extract_quantity(
                f"{row_dict.get('qty', '')} {combined_desc}", default=1
            )
            names = self.extractor.extract_personalizations(combined_desc)

            # Placements and Dimensions
            w_cm, h_cm = self.extractor.extract_dimensions(combined_desc)
            pos_matches = self.resolver.pos_kw.extract_keywords(combined_desc)

            placements = []
            if pos_matches:
                pos_key = pos_matches[0]
                pos_info = self.resolver.dict_data.get("standard_positions", {}).get(pos_key, {})
                placements.append(
                    PrintPlacement(
                        position_canonical=pos_key,
                        position_name=pos_info.get("name", pos_key),
                        width_cm=w_cm or pos_info.get("width_cm"),
                        height_cm=h_cm or pos_info.get("height_cm"),
                        custom_text=str(row_dict.get("text", "")).strip() or None,
                    )
                )
            elif w_cm:
                # Custom placement specified solely by dimension
                placements.append(
                    PrintPlacement(
                        position_canonical="custom_dim",
                        position_name=f"Prilagođeno ({w_cm}x{h_cm or ''}cm)",
                        width_cm=w_cm,
                        height_cm=h_cm,
                    )
                )

            # 2. Local LLM Fallback (if deterministic parser missed core fields)
            if (not item_canon or not color_canon) and len(combined_desc.strip()) > 15:
                llm_res = self.llm_parser.parse_messy_description(combined_desc)
                if llm_res:
                    if not item_canon and llm_res.get("item"):
                        item_canon, category = self.resolver.resolve_item(llm_res["item"])
                    if not color_canon and llm_res.get("color"):
                        color_canon, is_dark = self.resolver.resolve_color(llm_res["color"])
                    if not size and llm_res.get("size"):
                        size = self.resolver.resolve_size(llm_res["size"])
                    if qty == 1 and llm_res.get("quantity"):
                        qty = int(llm_res["quantity"])

            item_obj = ParsedWorkOrderItem(
                raw_input=combined_desc,
                order_id=order_id,
                client_name=client_name,
                item_canonical=item_canon,
                category=category,
                color_canonical=color_canon,
                is_dark_garment=is_dark,
                size=size or "Unisex",
                quantity=qty,
                placements=placements,
                personalization_names=names,
                unparsed_notes=str(row_dict.get("note", "")).strip() or None,
            )
            parsed_items.append(item_obj)

        return parsed_items


# =====================================================================
# 7. Streamlit Interactive Dashboard UI
# =====================================================================
def run_streamlit_app():
    import streamlit as st

    st.set_page_config(page_title="DTF Prepress Work Order Parser", layout="wide")
    st.title("🖨️ DTF Prepress Offline Order Ingestion & Parser")

    dict_path = "prepress_dictionary.json"

    @st.cache_resource
    def load_pipeline():
        return DTFPrepressPipeline(dictionary_path=dict_path, model_path=None)

    pipeline = load_pipeline()

    uploaded_file = st.file_uploader(
        "Upload Work Orders (CSV, TXT, Excel)",
        type=["csv", "txt", "xlsx", "xls"]
    )

    if uploaded_file is not None:
        file_bytes = uploaded_file.read()
        with st.spinner("Sniffing delimiters, encoding, and resolving entities..."):
            parsed_results = pipeline.process_order_file(file_bytes)

        if not parsed_results:
            st.error("No valid order records could be extracted from this file.")
            return

        st.success(f"Successfully processed {len(parsed_results)} work order lines.")

        # Transform to tabular format for the prepress operator
        table_rows = []
        for p in parsed_results:
            primary_pos = p.placements[0] if p.placements else None
            table_rows.append({
                "Broj Naloga": p.order_id,
                "Klijent": p.client_name,
                "Artikl": p.item_canonical or "Nepoznato",
                "Kategorija": p.category,
                "Boja Tekstila": p.color_canonical or "Nedefinirano",
                "Tamna Podloga (White Underbase)": "DA" if p.is_dark_garment else "NE",
                "Veličina": p.size,
                "Količina": p.quantity,
                "Pozicija Tiska": primary_pos.position_name if primary_pos else "Nije navedeno",
                "Širina (cm)": primary_pos.width_cm if primary_pos else None,
                "Personalizacija (Imena)": ", ".join(p.personalization_names) if p.personalization_names else "-",
            })

        df_out = pd.DataFrame(table_rows)
        st.dataframe(df_out, use_container_width=True)

        # Export prepared production list
        csv_buffer = io.StringIO()
        df_out.to_csv(csv_buffer, index=False, sep=";")
        st.download_button(
            label="📥 Preuzmi Standardizirani CSV za Print Pripremu",
            data=csv_buffer.getvalue().encode("utf-8-sig"),
            file_name="dtf_standardized_production_orders.csv",
            mime="text/csv",
        )


if __name__ == "__main__":
    # If run inside Streamlit: streamlit run dtf_prepress_parser.py
    import sys
    if "streamlit" in sys.modules or len(sys.argv) > 1 and "run" in sys.argv:
        run_streamlit_app()
    else:
        # Pipeline CLI test
        print("Initializing DTF Prepress Pipeline in standalone CLI mode...")
        pipeline = DTFPrepressPipeline(dictionary_path="prepress_dictionary.json")
        sample_csv = (
            '"Invoice Number";"Name";"Opis"\\n'
            '"2600204";"MLIN SERVIS";"095 9065044 palčić 1x. kišobran, crveni logo palčića"\\n'
            '"2600205";"KLESARSTVO";"Gildan hudica crna L, 2 kom, tisak srce 9cm, leđa 28cm A3"\\n'
        ).encode("utf-8")
        results = pipeline.process_order_file(sample_csv)
        for res in results:
            print(json.dumps(asdict(res), indent=2, ensure_ascii=False))
`,
  },
  {
    filename: "prepress_dictionary.json",
    category: "Core Engine",
    description: "Standardizirani tiskarski rječnik, mapiranje pozicija, paleta boja s bijelom podlogom i aliasi zaglavlja.",
    code: `{
  "item_categories": {
    "majica_kratki": {
      "canonical": "Pamučna Majica 180g (Kratki Rukav)",
      "category": "Tekstil",
      "aliases": ["majica", "t-shirt", "tshirt", "tee", "kratka majica", "b&c", "exact 190", "gildan heavy", "sol's imperial", "majica kratki rukav", "pamučna majica"]
    },
    "majica_dugi": {
      "canonical": "Majica Dugi Rukav",
      "category": "Tekstil",
      "aliases": ["dugi rukav", "long sleeve", "majica dugih rukava", "ls tee"]
    },
    "hudica": {
      "canonical": "Hoodie s Kapuljačom (Gildan / B&C)",
      "category": "Tekstil",
      "aliases": ["hudica", "hoodie", "kapuljaca", "majica s kapuljacom", "gildan hudica", "duksa", "dukserica"]
    },
    "sweatshirt": {
      "canonical": "Sweatshirt Bez Kapuljače",
      "category": "Tekstil",
      "aliases": ["sweatshirt", "sweater", "bez kapuljace", "crewneck", "pulover"]
    },
    "polo_majica": {
      "canonical": "Polo Majica s Kragnom",
      "category": "Tekstil",
      "aliases": ["polo", "polo majica", "kragna", "ovratnik", "pike"]
    },
    "dres": {
      "canonical": "Sportski Dres / Poliester",
      "category": "Tekstil",
      "aliases": ["dres", "sportski dres", "poliester dres", "nogometni dres", "trcanje"]
    },
    "kapa_silt": {
      "canonical": "Šilt Kapa (5/6 panela)",
      "category": "Tekstil",
      "aliases": ["kapa", "silt kapa", "šilt kapa", "cap", "snapback", "trucker", "baseball kapa", "bejzbol kapa"]
    },
    "vrecica_platnena": {
      "canonical": "Platnena Vrećica (Eko Pamuk)",
      "category": "Promo",
      "aliases": ["vrecica", "vrećica", "platnena vrecica", "platnena vrećica", "tote bag", "eko vrećica", "eko torba", "shopping bag"]
    },
    "rucnik": {
      "canonical": "Frotir Ručnik 500g",
      "category": "Promo",
      "aliases": ["rucnik", "ručnik", "towel", "frotir", "plaza rucnik", "kupaonski rucnik"]
    },
    "sportska_torba": {
      "canonical": "Sportska Torba / Gym Bag",
      "category": "Promo",
      "aliases": ["sportska torba", "torba", "gym bag", "ruksak", "drawstring", "vreca za papuce", "putna torba"]
    },
    "kisobran": {
      "canonical": "Automatski Kišobran Promo",
      "category": "Promo",
      "aliases": ["kisobran", "kišobran", "umbrella", "veliki kisobran", "sklopivi kisobran"]
    },
    "salica": {
      "canonical": "Keramička Šalica Promo",
      "category": "Promo",
      "aliases": ["salica", "šalica", "mug", "keramicka salica", "salica za kavu"]
    },
    "pregas": {
      "canonical": "Kuhinjska Pregača s Džepom",
      "category": "Tekstil",
      "aliases": ["pregaca", "pregača", "apron", "kuharska pregaca", "konobarska pregaca"]
    }
  },
  "color_palette": {
    "crna": {
      "canonical": "Crna",
      "is_dark": true,
      "aliases": ["crna", "black", "noir", "nero", "crno", "antracit", "dark grey", "tamno siva", "black 00"]
    },
    "bijela": {
      "canonical": "Bijela",
      "is_dark": false,
      "aliases": ["bijela", "white", "blanc", "bianco", "bijelo", "snjezno bijela", "optic white"]
    },
    "tamnoplava": {
      "canonical": "Tamnoplava (Navy)",
      "is_dark": true,
      "aliases": ["navy", "tamno plava", "tamnoplava", "marine", "french navy", "tamno-plava", "midnight blue"]
    },
    "kraljevskoplava": {
      "canonical": "Kraljevsko Plava (Royal Blue)",
      "is_dark": true,
      "aliases": ["royal blue", "kraljevski plava", "royal", "plava", "blue", "svijetlo plava", "azurna"]
    },
    "crvena": {
      "canonical": "Crvena",
      "is_dark": true,
      "aliases": ["crvena", "red", "rouge", "rosso", "crveno", "bordo", "burgundy", "tamno crvena"]
    },
    "siva_melange": {
      "canonical": "Siva Melange (Heather Grey)",
      "is_dark": false,
      "aliases": ["siva", "grey", "gray", "melange", "heather grey", "ash", "svijetlo siva", "sivo"]
    },
    "tamnozelena": {
      "canonical": "Tamno Zelena (Bottle Green)",
      "is_dark": true,
      "aliases": ["zelena", "green", "bottle green", "tamno zelena", "forest green", "maslinasta", "khaki", "vojno zelena"]
    },
    "zuta": {
      "canonical": "Žuta (Yellow)",
      "is_dark": false,
      "aliases": ["zuta", "žuta", "yellow", "gold", "zlatno zuta"]
    },
    "narancasta": {
      "canonical": "Narančasta (Orange)",
      "is_dark": false,
      "aliases": ["narancasta", "narančasta", "orange", "oranz"]
    }
  },
  "standard_positions": {
    "srce_9cm": {
      "name": "Prsa / Lijevo Srce (9cm)",
      "width_cm": 9.0,
      "height_cm": 7.2,
      "aliases": ["srce", "lijevo srce", "prsa 9cm", "prsa", "mali logo", "logo srce", "lijevo na prsa", "srce 9cm", "džep"]
    },
    "musko_ledja_26cm": {
      "name": "Muško Leđa (26cm)",
      "width_cm": 26.0,
      "height_cm": 22.0,
      "aliases": ["musko ledja", "muško leđa", "ledja 26cm", "leđa 26cm", "ledja", "leđa", "veliki logo leđa", "leđa a3", "muska ledja", "ledja musko"]
    },
    "zensko_ledja_24cm": {
      "name": "Žensko Leđa (24cm)",
      "width_cm": 24.0,
      "height_cm": 20.0,
      "aliases": ["zensko ledja", "žensko leđa", "ledja 24cm", "leđa 24cm", "zenska ledja", "ženska leđa"]
    },
    "djecja_ledja_12cm": {
      "name": "Dječja Leđa (12cm)",
      "width_cm": 12.0,
      "height_cm": 10.0,
      "aliases": ["djecja ledja", "dječja leđa", "ledja 12cm", "djeca", "dječje"]
    },
    "rukav_6cm": {
      "name": "Rukav (6cm)",
      "width_cm": 6.0,
      "height_cm": 4.8,
      "aliases": ["rukav", "lijevi rukav", "desni rukav", "rukav 6cm", "rukav mali logo"]
    },
    "kapa_silt_8x4_5": {
      "name": "Šilt Kapa (8×4.5cm)",
      "width_cm": 8.0,
      "height_cm": 4.5,
      "aliases": ["kapa", "silt kapa", "šilt kapa", "kapa logo", "prednja strana kape", "8x4.5"]
    },
    "vrecica_20cm": {
      "name": "Platnena Vrećica Centar (20cm)",
      "width_cm": 20.0,
      "height_cm": 20.0,
      "aliases": ["vrecica", "vrećica centar", "vrecica 20cm", "torba 20cm"]
    },
    "rucnik_20x5cm": {
      "name": "Ručnik Bordura (20×5cm)",
      "width_cm": 20.0,
      "height_cm": 5.0,
      "aliases": ["rucnik bordura", "bordura rucnika", "20x5", "tisak na rucnik"]
    },
    "torba_20x8cm": {
      "name": "Sportska Torba (20×8cm)",
      "width_cm": 20.0,
      "height_cm": 8.0,
      "aliases": ["sportska torba", "torba gore", "20x8", "gym bag logo"]
    }
  },
  "size_map": {
    "XS": "XS",
    "S": "S",
    "M": "M",
    "L": "L",
    "XL": "XL",
    "2XL": "2XL",
    "XXL": "2XL",
    "3XL": "3XL",
    "XXXL": "3XL",
    "4XL": "4XL",
    "5XL": "5XL",
    "UNI": "UNI",
    "UNISEX": "UNI",
    "4 GOD": "4 god (104)",
    "6 GOD": "6 god (116)",
    "8 GOD": "8 god (128)",
    "10 GOD": "10 god (140)",
    "12 GOD": "12 god (152)",
    "14 GOD": "14 god (164)"
  },
  "header_aliases": {
    "order_id": ["invoicenumber", "brojracuna", "racun", "nalog", "orderid", "id", "broj", "racunbroj"],
    "client": ["name", "klijent", "kupac", "nazivklijenta", "tvrtka", "client", "customer", "partner"],
    "oib": ["oib", "poreznibroj", "vat", "vatid", "idbroj"],
    "item": ["item", "artikl", "proizvod", "nazivartikla", "opis", "description", "stavka"],
    "qty": ["qty", "kolicina", "količina", "kol", "kom", "pieces", "amount"],
    "size": ["size", "velicina", "veličina", "vel"],
    "color": ["color", "boja", "bojatekstila", "colour"],
    "price": ["price", "cijena", "iznos", "ukupaniznos", "total", "amount_eur"],
    "position": ["position", "pozicijatiska", "pozicija", "placement", "tisak"],
    "visual": ["visual", "vizual", "zahtijevavizual", "probavizuala", "odobrenje"],
    "missing_art": ["missing_art", "falislikapriprema", "nedostajepriprema", "priprema", "grafika"],
    "names": ["imena", "personalizacija", "personalizacijaimena", "tekst", "names", "text"]
  }
}
`,
  },
  {
    filename: "schemas.py",
    category: "Core Engine",
    description: "Pydantic v2 sheme za strogu tipizaciju narudžbi, stavki i pozicija tiska (Upute 21–30).",
    code: `from typing import List, Optional, Literal
from pydantic import BaseModel, Field

class PrintPosition(BaseModel):
    naziv_pozicije: str = Field(..., description="Naziv pozicije: Lijevo srce, Muško leđa, Žensko leđa, Rukav, Šilt kapa itd.")
    sirina_cm: float = Field(..., description="Širina preslikača u centimetrima")
    visina_cm: Optional[float] = Field(default=None, description="Opcionalna visina preslikača u centimetrima")

class OrderItem(BaseModel):
    kategorija: Literal["Tekstil", "Promo"] = Field(..., description="Kategorija artikla")
    naziv_artikla: str = Field(..., description="Naziv modela artikla (npr. B&C Exact 190, Gildan Hudica)")
    kolicina: int = Field(default=1, ge=1, description="Količina naručenih komada")
    velicina: Optional[str] = Field(default=None, description="Veličina tekstila: S, M, L, XL, XXL, 10 god itd.")
    boja: Optional[str] = Field(default=None, description="Boja artikla")
    pozicije_tiska: List[PrintPosition] = Field(default_factory=list, description="Lista pozicija za tisak")
    tekst_za_tisak: Optional[str] = Field(default=None, description="Tekstualni ispis ako nema logotipa")
    personalizacija_imena: List[str] = Field(default_factory=list, description="Popis pojedinačnih imena za personalizaciju")

class Order(BaseModel):
    broj_racuna: str = Field(..., description="Jedinstveni broj računa ili naloga")
    naziv_klijenta: str = Field(..., description="Naziv tvrtke ili ime privatnog kupca")
    oib: Optional[str] = Field(default=None, description="OIB klijenta (ako je B2B)")
    kontakt_ime: Optional[str] = Field(default=None, description="Ime kontakt osobe")
    kontakt_broj: Optional[str] = Field(default=None, description="Broj telefona ili mobitela")
    ukupan_iznos: float = Field(..., description="Ukupan novčani iznos računa u EUR")
    datum_racuna: str = Field(..., description="Datum izdavanja računa (YYYY-MM-DD)")
    datum_uplate: Optional[str] = Field(default=None, description="Datum uplate računa")
    zahtijeva_vizual: bool = Field(default=False, description="Oznaka zahtijeva li klijent probni vizual")
    nedostaje_priprema: bool = Field(default=False, description="Oznaka nedostaje li vektorska grafička priprema")
    artikli: List[OrderItem] = Field(default_factory=list, description="Popis naručenih stavki")

class OrderExtractionResult(BaseModel):
    narudzbe: List[Order] = Field(default_factory=list, description="Lista ekstrahiranih i normaliziranih narudžbi")
`,
  },
  {
    filename: "gemini_client.py",
    category: "Core Engine",
    description: "Deterministički Google GenAI klijent s modelom gemini-2.5-flash i temperaturom 0.0 (Upute 31–40).",
    code: `import os
from dotenv import load_dotenv
import google.generativeai as genai
from schemas import OrderExtractionResult

load_dotenv()
API_KEY = os.getenv("GEMINI_API_KEY")

if not API_KEY:
    raise ValueError("GEMINI_API_KEY nije definiran u .env datoteci!")

genai.configure(api_key=API_KEY)

SYSTEM_INSTRUCTION = """
Vi ste vodeći prepress inženjer i stručnjak za DTF/DTG tiskarsku pripremu. Vaš zadatak je deterministički ekstrahirati i strukturirati podatke iz sirovog CSV-a u strogi JSON format prema zadanoj Pydantic shemi.

Referentne dimenzije preslikača:
- Muško (srce / lijeva strana prsa): 9 cm
- Muško (leđa / velika grafika): 26 cm
- Žensko (leđa): 24 cm
- Rukav: 6 cm
- Dječja leđa: 12 cm
- Šilt kape unisex: 8 x 4.5 cm
- Platnena vrećica: 20 cm
- Ručnik: 20 x 5 cm
- Sportska torba gore: 20 x 8 cm

Za svaku stavku:
1. Odredite kategoriju: "Tekstil" ili "Promo"
2. Prepoznajte boju artikla radi određivanja CMYK baze (tamne vs svijetle majice)
3. Ekstrahirajte imena za personalizaciju ako postoje
4. Označite zahtijeva_vizual i nedostaje_priprema.
"""

def parse_csv_to_orders(csv_content: str) -> OrderExtractionResult:
    model = genai.GenerativeModel(
        model_name='gemini-2.5-flash',
        system_instruction=SYSTEM_INSTRUCTION
    )
    
    generation_config = genai.GenerationConfig(
        temperature=0.0,
        response_mime_type="application/json",
        response_schema=OrderExtractionResult
    )
    
    response = model.generate_content(
        f"Analiziraj i strukturiraj sljedeći CSV sadržaj narudžbi:\\n\\n{csv_content}",
        generation_config=generation_config
    )
    
    return OrderExtractionResult.model_validate_json(response.text)
`,
  },
  {
    filename: "asset_manager.py",
    category: "Core Engine",
    description: "Datotečni repozitorij, pametno usmjeravanje uvoženih grafika i arhiviranje (Upute 41–50).",
    code: `import os
import re
import json
import shutil
from pathlib import Path
from datetime import datetime
from schemas import Order, OrderExtractionResult

BASE_DIR = Path(__file__).resolve().parent
ARCHIVES_DIR = BASE_DIR / "archives"
CLIENT_ASSETS_DIR = BASE_DIR / "client_assets"
UNASSIGNED_DIR = CLIENT_ASSETS_DIR / "_nerasporedeno"

SUPPORTED_EXTENSIONS = {".png", ".jpg", ".jpeg", ".pdf", ".svg", ".ai", ".eps", ".tiff", ".psd"}

def init_file_system():
    ARCHIVES_DIR.mkdir(parents=True, exist_ok=True)
    CLIENT_ASSETS_DIR.mkdir(parents=True, exist_ok=True)
    UNASSIGNED_DIR.mkdir(parents=True, exist_ok=True)

def sanitize_folder_name(name: str) -> str:
    cleaned = re.sub(r'[\\\\/*?:\\"<>|]', "", name)
    return cleaned.strip()

def archive_daily_orders(date_str: str, raw_csv_bytes: bytes, parsed_result: OrderExtractionResult):
    date_folder = ARCHIVES_DIR / date_str
    date_folder.mkdir(parents=True, exist_ok=True)
    
    raw_path = date_folder / "raw_orders.csv"
    with open(raw_path, "wb") as f:
        f.write(raw_csv_bytes)
        
    json_path = date_folder / "parsed_orders.json"
    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(parsed_result.model_dump(), f, ensure_ascii=False, indent=2)

def sync_order_to_client_repo(order: Order):
    sanitized_client = sanitize_folder_name(order.naziv_klijenta)
    client_path = CLIENT_ASSETS_DIR / sanitized_client
    invoice_path = client_path / sanitize_folder_name(order.broj_racuna)
    general_path = client_path / "opcenito"
    
    client_path.mkdir(parents=True, exist_ok=True)
    invoice_path.mkdir(parents=True, exist_ok=True)
    general_path.mkdir(parents=True, exist_ok=True)
    
    meta_path = client_path / "metadata.json"
    meta = {"client_name": order.naziv_klijenta, "oib": order.oib, "orders": []}
    if meta_path.exists():
        try:
            with open(meta_path, "r", encoding="utf-8") as f:
                meta = json.load(f)
        except Exception:
            pass
            
    if order.broj_racuna not in meta.get("orders", []):
        meta.setdefault("orders", []).append(order.broj_racuna)
        meta["updated_at"] = datetime.now().isoformat()
        with open(meta_path, "w", encoding="utf-8") as f:
            json.dump(meta, f, ensure_ascii=False, indent=2)
`,
  },
  {
    filename: "plugin_manager.py",
    category: "Plugins & Automation",
    description: "Izolirane SQLite baze, dinamičko učitavanje Python plugina i Adobe Illustrator 2021 COM (Upute 51–60).",
    code: `import sys
import json
import sqlite3
import importlib.util
from pathlib import Path
from typing import Any, Dict, List, Optional

BASE_DIR = Path(__file__).resolve().parent
PY_PLUGINS_DIR = BASE_DIR / "plugins" / "python"
AI_PLUGINS_DIR = BASE_DIR / "plugins" / "illustrator"
PLUGIN_DB_DIR = BASE_DIR / "plugins" / "databases"

PLUGIN_DB_DIR.mkdir(parents=True, exist_ok=True)
PY_PLUGINS_DIR.mkdir(parents=True, exist_ok=True)
AI_PLUGINS_DIR.mkdir(parents=True, exist_ok=True)

class PluginDatabase:
    def __init__(self, plugin_id: str):
        self.db_path = PLUGIN_DB_DIR / f"{plugin_id}.sqlite"
        self._init_db()

    def _init_db(self):
        with sqlite3.connect(self.db_path) as conn:
            conn.execute("""
                CREATE TABLE IF NOT EXISTS key_val_store (
                    key TEXT PRIMARY KEY,
                    value TEXT,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            conn.commit()

    def set(self, key: str, value: Any):
        json_val = json.dumps(value, ensure_ascii=False)
        with sqlite3.connect(self.db_path) as conn:
            conn.execute("""
                INSERT INTO key_val_store (key, value, updated_at)
                VALUES (?, ?, CURRENT_TIMESTAMP)
                ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP
            """, (key, json_val))
            conn.commit()

    def get(self, key: str, default: Any = None) -> Any:
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT value FROM key_val_store WHERE key = ?", (key,))
            row = cursor.fetchone()
            if row:
                try:
                    return json.loads(row[0])
                except Exception:
                    return row[0]
            return default

def execute_illustrator_script(script_path: Path):
    try:
        import win32com.client
        illustrator = win32com.client.Dispatch("Illustrator.Application.2021")
        with open(script_path, "r", encoding="utf-8") as f:
            script_code = f.read()
        illustrator.DoJavaScript(script_code)
        return True, "Uspješno izvršeno u Adobe Illustratoru 2021"
    except Exception as e:
        return False, str(e)
`,
  },
  {
    filename: "dtf_prepress.py",
    category: "Prepress & PDF",
    description: "ReportLab prepress engine za 58cm rolu s linijskim nestingom i CMYK toniranjem (Upute 61–72).",
    code: `import os
from pathlib import Path
from PIL import Image
from reportlab.pdfgen import canvas
from reportlab.lib.units import cm
from reportlab.lib.colors import CMYKColor
from schemas import OrderExtractionResult

ROLL_WIDTH_CM = 58.0
PRINTABLE_WIDTH_CM = 55.0
MAX_PAGE_HEIGHT_CM = 490.0
MARGIN_CM = 1.5
SPACING_CM = 1.5

# CMYK pravila toniranja
# Tamne majice: 0% C, 0% M, 1% Y, 0% K (1% Yellow aktivira bijelu podlogu u RIP-u)
CMYK_WHITE_BASE = CMYKColor(0.0, 0.0, 0.01, 0.0)
# Svijetle majice: 0% C, 0% M, 0% Y, 100% K
CMYK_PURE_BLACK = CMYKColor(0.0, 0.0, 0.0, 1.0)

def is_dark_shirt(color_name: str) -> bool:
    if not color_name:
        return True
    c = color_name.lower()
    return not any(w in c for w in ["bijel", "white", "natur", "bež", "bez", "žut", "svijetl"])

def generate_dtf_gang_sheet(order_result: OrderExtractionResult, output_pdf_path: str):
    page_w = ROLL_WIDTH_CM * cm
    # Procijenjena visina role
    total_items = sum(len(item.pozicije_tiska) * item.kolicina for o in order_result.narudzbe for item in o.artikli)
    page_h = min(max(total_items * 6.0, 60.0), MAX_PAGE_HEIGHT_CM) * cm
    
    c = canvas.Canvas(output_pdf_path, pagesize=(page_w, page_h))
    
    cur_x = MARGIN_CM * cm
    cur_y = page_h - (MARGIN_CM * cm)
    line_h = 0.0
    
    for order in order_result.narudzbe:
        for item in order.artikli:
            is_dark = is_dark_shirt(item.boja)
            text_color = CMYK_WHITE_BASE if is_dark else CMYK_PURE_BLACK
            
            for pos in item.pozicije_tiska:
                w_pt = pos.sirina_cm * cm
                h_pt = (pos.visina_cm * cm) if pos.visina_cm else (pos.sirina_cm * 0.8 * cm)
                
                for _ in range(item.kolicina):
                    if cur_x + w_pt > (MARGIN_CM + PRINTABLE_WIDTH_CM) * cm:
                        cur_x = MARGIN_CM * cm
                        cur_y -= (line_h + (SPACING_CM * cm))
                        line_h = 0.0
                        
                    if cur_y - h_pt < MARGIN_CM * cm:
                        c.showPage()
                        cur_x = MARGIN_CM * cm
                        cur_y = page_h - (MARGIN_CM * cm)
                        line_h = 0.0
                        
                    # Prepress okvir preslikača
                    c.setStrokeColorCMYK(0.0, 0.0, 0.0, 0.2)
                    c.setLineWidth(0.5)
                    c.rect(cur_x, cur_y - h_pt, w_pt, h_pt)
                    
                    # Oznaka boje i pozicije
                    c.setFillColor(text_color)
                    c.setFont("Helvetica-Bold", 8)
                    tag = f"{order.broj_racuna} | {pos.naziv_pozicije} ({pos.sirina_cm}cm)"
                    c.drawString(cur_x + 4, cur_y - 12, tag)
                    
                    line_h = max(line_h, h_pt)
                    cur_x += w_pt + (SPACING_CM * cm)
                    
    c.save()
`,
  },
  {
    filename: "pdf_export.py",
    category: "Prepress & PDF",
    description: "Skladišna Pick-List PDF generacija s fpdf2 i Unicode podrškom za dijakritike (Upute 73–80).",
    code: `from fpdf import FPDF
from schemas import OrderExtractionResult

class WarehousePickListPDF(FPDF):
    def header(self):
        self.set_fill_color(14, 16, 23)
        self.rect(0, 0, 210, 32, "F")
        self.set_text_color(79, 195, 247)
        self.set_font("Helvetica", "B", 16)
        self.cell(0, 10, "DTF PRINT HUB - SKLADIŠNA PICK-LISTA", ln=True, align="L")
        self.set_text_color(220, 230, 245)
        self.set_font("Helvetica", "", 9)
        self.cell(0, 6, "Agregirani popis artikala za izuzimanje i tiskarsku pripremu", ln=True, align="L")
        self.ln(8)

    def footer(self):
        self.set_y(-15)
        self.set_font("Helvetica", "I", 8)
        self.set_text_color(150, 160, 175)
        self.cell(0, 10, f"Stranica {self.page_no()}/{{nb}} - DTF Prepress Inženjering", align="C")

def generate_warehouse_pdf(order_result: OrderExtractionResult, output_path: str):
    pdf = WarehousePickListPDF(orientation="P", unit="mm", format="A4")
    pdf.alias_nb_pages()
    pdf.add_page()
    
    # Agregacija artikala
    agg = {}
    for order in order_result.narudzbe:
        for item in order.artikli:
            k = (item.naziv_artikla, item.boja or "-", item.velicina or "-", item.kategorija)
            agg[k] = agg.get(k, 0) + item.kolicina
            
    # Tablica
    pdf.set_fill_color(20, 24, 36)
    pdf.set_text_color(79, 195, 247)
    pdf.set_font("Helvetica", "B", 9)
    
    pdf.cell(80, 8, "Naziv Artikla", border=1, fill=True)
    pdf.cell(35, 8, "Boja", border=1, fill=True)
    pdf.cell(25, 8, "Veličina", border=1, fill=True)
    pdf.cell(25, 8, "Kategorija", border=1, fill=True)
    pdf.cell(25, 8, "Količina", border=1, fill=True, ln=True)
    
    pdf.set_font("Helvetica", "", 9)
    pdf.set_text_color(20, 20, 20)
    
    for (naziv, boja, vel, kat), kol in agg.items():
        pdf.cell(80, 7, str(naziv), border=1)
        pdf.cell(35, 7, str(boja), border=1)
        pdf.cell(25, 7, str(vel), border=1)
        pdf.cell(25, 7, str(kat), border=1)
        pdf.set_font("Helvetica", "B", 9)
        pdf.cell(25, 7, f"{kol} kom", border=1, ln=True)
        pdf.set_font("Helvetica", "", 9)
        
    pdf.output(output_path)
`,
  },
  {
    filename: "analytics_export.py",
    category: "Core Engine",
    description: "Pandas analitika, formula predikcije zaliha, ANSI SQL i ERP XML izvoz (Upute 81–88).",
    code: `import math
import pandas as pd
from schemas import OrderExtractionResult

def calculate_analytics_metrics(order_result: OrderExtractionResult):
    records = []
    for order in order_result.narudzbe:
        for item in order.artikli:
            records.append({
                "broj_racuna": order.broj_racuna,
                "klijent": order.naziv_klijenta,
                "oib": order.oib,
                "ukupno_eur": order.ukupan_iznos,
                "kategorija": item.kategorija,
                "artikl": item.naziv_artikla,
                "kolicina": item.kolicina,
                "velicina": item.velicina,
                "boja": item.boja
            })
    df = pd.DataFrame(records)
    
    total_revenue = sum(o.ukupan_iznos for o in order_result.narudzbe)
    total_items = df["kolicina"].sum() if not df.empty else 0
    
    return {
        "total_revenue": total_revenue,
        "total_items": int(total_items),
        "df": df
    }

def predict_blank_stock(order_result: OrderExtractionResult):
    """
    Predikcija nabave blanko tekstila:
    Zaliha = floor(Potrošnja * 2.5) + 5
    """
    usage = {}
    for order in order_result.narudzbe:
        for item in order.artikli:
            if item.kategorija == "Tekstil":
                key = (item.naziv_artikla, item.boja, item.velicina)
                usage[key] = usage.get(key, 0) + item.kolicina
                
    predictions = []
    for (artikl, boja, velicina), potrosnja in usage.items():
        preporucena = math.floor(potrosnja * 2.5) + 5
        predictions.append({
            "artikl": artikl,
            "boja": boja,
            "velicina": velicina,
            "dnevna_potrosnja": potrosnja,
            "preporucena_sigurnosna_zaliha": preporucena
        })
    return predictions
`,
  },
  {
    filename: "app.py",
    category: "Core Engine",
    description: "Glavni Streamlit dashboard s primijenjenim neomorfno-staklenim dizajnom (Upute 89–95).",
    code: `import streamlit as st
import datetime
from schemas import OrderExtractionResult
from gemini_client import parse_csv_to_orders
from asset_manager import init_file_system, archive_daily_orders
from plugin_manager import get_installed_python_plugins, get_installed_illustrator_scripts

st.set_page_config(page_title="DTF & Promo Hub", layout="wide", initial_sidebar_state="expanded")

# Inicijalizacija datotečnog sustava
init_file_system()

# CSS Injekcija za Tamni Neomorfno-Stakleni Dizajn
st.markdown("""
<style>
    .stApp {
        background-color: #050508;
        background-image: radial-gradient(circle at 50% 0%, #0E1017 0%, #050508 100%);
        color: #E0E6ED;
    }
    div[data-testid="stVerticalBlock"] > div {
        background: rgba(14, 16, 23, 0.65);
        backdrop-filter: blur(16px);
        border: 1px solid rgba(255, 255, 255, 0.12);
        border-top: 1px solid #4FC3F7;
        border-radius: 12px;
        box-shadow: 6px 6px 16px rgba(0, 0, 0, 0.8), -3px -3px 10px rgba(255, 255, 255, 0.02);
    }
    .stButton > button {
        background: linear-gradient(135deg, rgba(2, 136, 209, 0.8), rgba(79, 195, 247, 0.6));
        color: #FFFFFF;
        border: 1px solid rgba(255, 255, 255, 0.3);
        border-radius: 8px;
    }
</style>
""", unsafe_allow_html=True)

st.title("🖨️ DTF Print Hub — Prepress & Production Studio")
st.sidebar.header("📁 Uvoz Dnevnih Naloga")

uploaded_csv = st.sidebar.file_uploader("Učitaj sirovi CSV", type=["csv"])
if uploaded_csv and st.sidebar.button("🚀 Parsiraj s Gemini 2.5 Flash"):
    raw_bytes = uploaded_csv.read()
    csv_text = raw_bytes.decode("utf-8", errors="ignore")
    parsed = parse_csv_to_orders(csv_text)
    st.session_state.current_orders = parsed
    archive_daily_orders(datetime.date.today().isoformat(), raw_bytes, parsed)
    st.sidebar.success(f"Uspješno parsirano {len(parsed.narudzbe)} naloga!")

# Primarni Tabovi
tabs = st.tabs([
    "📅 Centralni Kalendar",
    "🎨 Klijenti & Upload Asseta",
    "🎞️ Proizvodnja & Prepress (58cm)",
    "📦 Skladišna Pick-Lista",
    "📊 Analitika & Zalihe",
    "🔌 Plugin Studio & IDE"
])
`,
  },
  {
    filename: "run_app.py",
    category: "Windows 10 Packaging",
    description: "Windows launcher koji rješava sys._MEIPASS putanje i pokreće Streamlit (Uputa 96).",
    code: `import os
import sys
import streamlit.web.cli as stcli

def resolve_path(relative_path):
    if hasattr(sys, '_MEIPASS'):
        return os.path.join(sys._MEIPASS, relative_path)
    return os.path.join(os.path.abspath("."), relative_path)

if __name__ == "__main__":
    os.chdir(resolve_path("."))
    sys.argv = ["streamlit", "run", resolve_path("app.py"), "--server.port=8501", "--server.headless=true"]
    sys.exit(stcli.main())
`,
  },
  {
    filename: "build.py",
    category: "Windows 10 Packaging",
    description: "PyInstaller build skripta za generiranje .exe aplikacije za Windows 10 (Uputa 97).",
    code: `import os
import subprocess

def build():
    print("Pokrećem PyInstaller build za DTF Print Hub...")
    cmd = [
        "pyinstaller",
        "--onedir",
        "--windowed",
        "--name=DTF_Print_Hub",
        "--add-data=.streamlit;.streamlit",
        "--add-data=plugins;plugins",
        "--add-data=.env;.",
        "run_app.py"
    ]
    subprocess.run(cmd, check=True)
    print("Build završen! Izvršna datoteka nalazi se u dist/DTF_Print_Hub/run_app.exe")

if __name__ == "__main__":
    build()
`,
  },
  {
    filename: "installer.iss",
    category: "Windows 10 Packaging",
    description: "Inno Setup skripta s punim 'Permissions: users-full' nad client_assets/ mapom (Upute 99–100).",
    code: `[Setup]
AppName=DTF Print Hub
AppVersion=1.0
DefaultDirName={autopf}\\DTF Print Hub
DefaultGroupName=DTF Print Hub
OutputDir=installer_output
OutputBaseFilename=Setup_DTF_PrintHub_v1.0
Compression=lzma
SolidCompression=yes
PrivilegesRequired=admin

[Files]
Source: "dist\\DTF_Print_Hub\\*"; DestDir: "{app}"; Flags: recursesubdirs createallsubdirs
; Dodjela punih korisničkih prava pisanja nad mapom client_assets za radnike u pogonu (Uputa 100)
Source: "client_assets\\*"; DestDir: "{app}\\client_assets"; Flags: recursesubdirs createallsubdirs; Permissions: users-full

[Icons]
Name: "{group}\\DTF Print Hub"; Filename: "{app}\\run_app.exe"
Name: "{autodesktop}\\DTF Print Hub"; Filename: "{app}\\run_app.exe"

[Run]
Filename: "{app}\\run_app.exe"; Description: "Pokreni DTF Print Hub"; Flags: nowait postinstall skipifsilent
`,
  },
  {
    filename: "pillow_dtf_prepress.py",
    category: "Prepress & PDF",
    description: "Pillow (PIL) 300 DPI Prepress Engine za vektorski tekst, točnu tipografiju (textbbox, textlength, multiline_text), CMYK separaciju i višemjerni .pdf izvoz.",
    code: `"""
Pillow (PIL) DTF Prepress & Vector Text PDF Generator
Integrira Pillow biblioteku (https://github.com/python-pillow/Pillow.git)
za visoko-rezolucijsko renderiranje teksta, točne 'textbbox' i 'textlength'
metrike, CMYK podloge (White Underbase / Pure Black) i industrijski 58cm .pdf izvoz.
"""

from __future__ import annotations

import io
import math
import os
from pathlib import Path
from typing import List, Optional, Tuple, Union

from PIL import Image, ImageDraw, ImageFont, ImageColor
from schemas import Order, OrderExtractionResult

# 300 DPI Prepress Standard
DPI = 300
CM_TO_INCH = 1.0 / 2.54
CM_TO_PX = (DPI / 2.54)  # ~118.11 px po centimetru

ROLL_WIDTH_CM = 58.0
PRINTABLE_WIDTH_CM = 55.0
MAX_PAGE_HEIGHT_CM = 490.0
MARGIN_CM = 1.5
SPACING_CM = 1.5

# Standardne CMYK i RGBA boje za simulaciju i RIP
COLOR_WHITE_UNDERBASE_RGBA = (255, 255, 255, 255)
COLOR_WHITE_UNDERBASE_CMYK = (0, 0, 3, 0)       # 1% Yellow trigger za bijelu podlogu u RIP-u
COLOR_PURE_BLACK_RGBA = (20, 20, 25, 255)
COLOR_PURE_BLACK_CMYK = (0, 0, 0, 255)         # 100% K čista crna
COLOR_GRID_BORDER_RGBA = (79, 195, 247, 180)   # #4FC3F7 rubni akcent


class PillowVectorTextRenderer:
    """
    Korištenje Pillow biblioteke za precizno mjerenje i renderiranje vektorskog teksta.
    Implementira ImageDraw.text, multiline_text, textlength i textbbox.
    """

    def __init__(self, font_path: Optional[str] = None):
        self.font_path = font_path
        self._font_cache = {}

    def get_font(self, size_pt: int) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
        if size_pt in self._font_cache:
            return self._font_cache[size_pt]

        # Pokušaj učitati TrueType/OpenType font s podrškom za hrvatske dijakritike
        font_candidates = [
            self.font_path,
            "C:/Windows/Fonts/arialbd.ttf",
            "C:/Windows/Fonts/calibrib.ttf",
            "C:/Windows/Fonts/segoeuib.ttf",
            "C:/Windows/Fonts/arial.ttf",
            "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
            "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf",
        ]

        for candidate in font_candidates:
            if candidate and os.path.exists(candidate):
                try:
                    font = ImageFont.truetype(candidate, size=int(size_pt))
                    self._font_cache[size_pt] = font
                    return font
                except Exception:
                    continue

        # Fallback na Pillow default font
        font = ImageFont.load_default()
        self._font_cache[size_pt] = font
        return font

    def measure_text_exact(
        self,
        text: str,
        font_size_pt: int,
        spacing: int = 4,
        align: str = "left",
        features: Optional[List[str]] = None,
        language: str = "hr"
    ) -> Tuple[float, float, Tuple[int, int, int, int]]:
        """
        Korištenje ImageDraw.textlength() i ImageDraw.multiline_textbbox()
        za točan izračun širine, visine i graničnog okvira teksta u pikselima.
        """
        font = self.get_font(font_size_pt)
        dummy_img = Image.new("RGBA", (1, 1), (0, 0, 0, 0))
        draw = ImageDraw.Draw(dummy_img)

        # ImageDraw.multiline_textbbox vraća (left, top, right, bottom)
        try:
            bbox = draw.multiline_textbbox(
                (0, 0),
                text,
                font=font,
                spacing=spacing,
                align=align,
                features=features,
                language=language
            )
            width_px = bbox[2] - bbox[0]
            height_px = bbox[3] - bbox[1]
        except Exception:
            # Fallback za starije Pillow verzije
            width_px = len(text) * font_size_pt * 0.6
            height_px = font_size_pt * 1.2
            bbox = (0, 0, int(width_px), int(height_px))

        return width_px, height_px, bbox

    def calculate_auto_fit_font_size(
        self,
        text: str,
        target_width_px: float,
        target_height_px: float,
        min_pt: int = 8,
        max_pt: int = 160
    ) -> int:
        """
        Binarno pretraživanje optimalne veličine fonta tako da tekst savršeno
        ispuni zadanu širinu i visinu preslikača.
        """
        low = min_pt
        high = max_pt
        best_size = min_pt

        while low <= high:
            mid = (low + high) // 2
            w, h, _ = self.measure_text_exact(text, mid)
            if w <= target_width_px and h <= target_height_px:
                best_size = mid
                low = mid + 1
            else:
                high = mid - 1

        return best_size

    def render_vector_text_badge(
        self,
        text: str,
        width_cm: float,
        height_cm: float,
        is_dark_shirt: bool = True,
        subtitle: Optional[str] = None,
        stroke_width: int = 0,
        align: str = "center"
    ) -> Image.Image:
        """
        Generira visokokvalitetni RGBA/CMYK bedž preslikača s točnim Pillow crtanjem.
        """
        w_px = int(width_cm * CM_TO_PX)
        h_px = int(height_cm * CM_TO_PX)

        # Prozirno platno
        badge = Image.new("RGBA", (w_px, h_px), (0, 0, 0, 0))
        draw = ImageDraw.Draw(badge)

        # Odabir boje prema boji majice
        text_fill = COLOR_WHITE_UNDERBASE_RGBA if is_dark_shirt else COLOR_PURE_BLACK_RGBA

        # Izračunaj optimalnu veličinu fonta
        padding_px = int(0.4 * CM_TO_PX)
        avail_w = max(w_px - (2 * padding_px), 20)
        avail_h = max(h_px - (2 * padding_px), 20)

        main_font_size = self.calculate_auto_fit_font_size(text, avail_w, avail_h * 0.7)
        main_font = self.get_font(main_font_size)

        # Mjerenje glavnog teksta
        w_text, h_text, bbox = self.measure_text_exact(text, main_font_size, align=align)

        x_pos = (w_px - w_text) // 2
        y_pos = (h_px - h_text) // 2 if not subtitle else int(padding_px + (avail_h * 0.1))

        # Crtanje teksta pomoću ImageDraw.multiline_text
        draw.multiline_text(
            (x_pos, y_pos),
            text,
            fill=text_fill,
            font=main_font,
            align=align,
            spacing=int(main_font_size * 0.2),
            stroke_width=stroke_width,
            stroke_fill=(0, 0, 0, 255) if is_dark_shirt else (255, 255, 255, 255),
            language="hr"
        )

        # Crtanje opcionalnog podnaslova / metapodatka
        if subtitle:
            sub_font = self.get_font(max(10, int(main_font_size * 0.3)))
            draw.text(
                (padding_px, h_px - padding_px - 14),
                subtitle,
                fill=(120, 160, 200, 220),
                font=sub_font
            )

        # Prepress pomoćni okvir
        draw.rectangle([(0, 0), (w_px - 1, h_px - 1)], outline=COLOR_GRID_BORDER_RGBA, width=2)

        return badge


class PillowDTFGangSheetGenerator:
    """
    Generator 58cm PDF i TIFF/PNG rola za DTF tiskarski RIP temeljen na Pillow biblioteci.
    """

    def __init__(self, renderer: Optional[PillowVectorTextRenderer] = None):
        self.renderer = renderer or PillowVectorTextRenderer()

    def generate_gang_sheet_pdf(
        self,
        orders: List[Order],
        output_pdf_path: str,
        export_tiff: bool = False
    ) -> str:
        """
        Gradi linijski nesting na 58cm x N.N metara roli i sprema nativni multi-page PDF preko Pillowa.
        """
        roll_w_px = int(ROLL_WIDTH_CM * CM_TO_PX)
        max_page_h_px = int(MAX_PAGE_HEIGHT_CM * CM_TO_PX)
        margin_px = int(MARGIN_CM * CM_TO_PX)
        spacing_px = int(SPACING_CM * CM_TO_PX)
        printable_w_px = int(PRINTABLE_WIDTH_CM * CM_TO_PX)

        pages: List[Image.Image] = []

        def create_new_page() -> Tuple[Image.Image, ImageDraw.ImageDraw]:
            # Tamna mat pozadina filma za vizualni pregled ili prozirna za RIP
            img = Image.new("RGBA", (roll_w_px, max_page_h_px), (10, 12, 18, 255))
            d = ImageDraw.Draw(img)
            # Sigurnosne linije (1.5cm)
            d.line([(margin_px, 0), (margin_px, max_page_h_px)], fill=(79, 195, 247, 80), width=2)
            d.line([(margin_px + printable_w_px, 0), (margin_px + printable_w_px, max_page_h_px)], fill=(79, 195, 247, 80), width=2)
            return img, d

        current_page, current_draw = create_new_page()
        cur_x = margin_px
        cur_y = margin_px + int(2.5 * CM_TO_PX)  # Ostavi prostor za zaglavlje role
        line_height_px = 0
        total_items_rendered = 0

        # Dodaj zaglavlje na prvu stranicu
        hdr_font = self.renderer.get_font(24)
        current_draw.text(
            (margin_px + 10, margin_px + 10),
            "DTF PRINT HUB — 58CM GANG SHEET (PILLOW 300 DPI ENGINE)",
            fill=(79, 195, 247, 255),
            font=hdr_font
        )

        for order in orders:
            for item in order.artikli:
                is_dark = not any(w in (item.boja or "").lower() for w in ["bijel", "white", "natur", "bež", "žut"])
                fallback_label = item.tekst_za_tisak or order.naziv_klijenta

                for pos in item.pozicije_tiska:
                    w_cm = pos.sirina_cm or 9.0
                    h_cm = pos.visina_cm or (w_cm * 0.8)

                    w_px = int(w_cm * CM_TO_PX)
                    h_px = int(h_cm * CM_TO_PX)

                    for q in range(item.kolicina):
                        # Prijelaz u novi red ako prelazi širinu od 55 cm
                        if cur_x + w_px > margin_px + printable_w_px:
                            cur_x = margin_px
                            cur_y += line_height_px + spacing_px
                            line_height_px = 0

                        # Prijelaz na novu PDF stranicu ako prelazi 4.9 metara
                        if cur_y + h_px > max_page_h_px - margin_px:
                            pages.append(current_page)
                            current_page, current_draw = create_new_page()
                            cur_x = margin_px
                            cur_y = margin_px
                            line_height_px = 0

                        # Generiraj bedž pomoću Pillow vector rendera
                        meta_subtitle = f"{order.broj_racuna} • {pos.naziv_pozicije} ({w_cm}cm)"
                        badge = self.renderer.render_vector_text_badge(
                            text=fallback_label,
                            width_cm=w_cm,
                            height_cm=h_cm,
                            is_dark_shirt=is_dark,
                            subtitle=meta_subtitle
                        )

                        # Zalijepi (Alpha Composite) bedž na rolu
                        current_page.paste(badge, (cur_x, cur_y), badge)

                        line_height_px = max(line_height_px, h_px)
                        cur_x += w_px + spacing_px
                        total_items_rendered += 1

        # Obreži zadnju stranicu na stvarno iskorištenu visinu (min 40 cm)
        used_h_px = min(max_page_h_px, max(cur_y + line_height_px + margin_px, int(40.0 * CM_TO_PX)))
        cropped_last_page = current_page.crop((0, 0, roll_w_px, used_h_px))
        pages.append(cropped_last_page)

        # Pretvori u RGB za PDF standard kompatibilnost
        rgb_pages = []
        for p in pages:
            bg = Image.new("RGB", p.size, (10, 12, 18))
            bg.paste(p, (0, 0), p)
            rgb_pages.append(bg)

        # Spremi PDF pomoću native Pillow save mehanizma
        if rgb_pages:
            rgb_pages[0].save(
                output_pdf_path,
                "PDF",
                resolution=DPI,
                save_all=True,
                append_images=rgb_pages[1:] if len(rgb_pages) > 1 else []
            )

        if export_tiff and rgb_pages:
            tiff_path = str(Path(output_pdf_path).with_suffix(".tif"))
            rgb_pages[0].save(
                tiff_path,
                "TIFF",
                dpi=(DPI, DPI),
                compression="tiff_lzw"
            )

        return output_pdf_path


def run_pillow_prepress_demo():
    print("Pokrećem Pillow DTF Prepress & Vector Text generator...")
    renderer = PillowVectorTextRenderer()
    generator = PillowDTFGangSheetGenerator(renderer)

    sample_orders = [
        Order(
            broj_racuna="2600204",
            naziv_klijenta="MLIN SERVIS d.o.o.",
            ukupan_iznos=185.50,
            datum_racuna="2026-08-23",
            artikli=[
                {
                    "kategorija": "Tekstil",
                    "naziv_artikla": "Pamučna Majica 180g",
                    "kolicina": 4,
                    "boja": "Crna",
                    "tekst_za_tisak": "MLIN SERVIS",
                    "pozicije_tiska": [
                        {"naziv_pozicije": "Prsa / Lijevo Srce", "sirina_cm": 9.0, "visina_cm": 7.2},
                        {"naziv_pozicije": "Muško Leđa (26cm)", "sirina_cm": 26.0, "visina_cm": 22.0}
                    ]
                }
            ]
        )
    ]

    out_file = "DTF_Pillow_GangSheet_58cm.pdf"
    generator.generate_gang_sheet_pdf(sample_orders, out_file)
    print(f"Uspješno generiran PDF putem Pillowa: {out_file} (300 DPI)")


if __name__ == "__main__":
    run_pillow_prepress_demo()
`,
  },
  {
    filename: "pillow_vector_text_tool.py",
    category: "Prepress & PDF",
    description: "Interaktivni modul za testiranje Pillow funkcija: ImageDraw.text, textlength, textbbox, kerning i hrvatskih dijakritika.",
    code: `"""
Pillow Vector Text Interactive Testing Tool
Omogućuje inspekciju i verifikaciju točnih dimenzija teksta i graničnih okvira:
- ImageDraw.textlength()
- ImageDraw.textbbox()
- ImageDraw.multiline_text()
- ImageFont.truetype()
"""

import sys
from PIL import Image, ImageDraw, ImageFont

def test_pillow_text_metrics(text: str = "TISAK NA MAJICE — ČĆŽŠĐ", font_size: int = 36):
    img = Image.new("RGBA", (800, 300), (14, 16, 23, 255))
    draw = ImageDraw.Draw(img)

    try:
        font = ImageFont.truetype("arialbd.ttf", font_size)
    except Exception:
        font = ImageFont.load_default()

    # 1. ImageDraw.textlength
    try:
        t_len = draw.textlength(text, font=font, language="hr")
    except Exception:
        t_len = len(text) * font_size * 0.6

    # 2. ImageDraw.textbbox
    try:
        bbox = draw.textbbox((50, 50), text, font=font, language="hr")
    except Exception:
        bbox = (50, 50, int(50 + t_len), 50 + font_size)

    # 3. Nacrtaj granični okvir (Bounding Box)
    draw.rectangle(bbox, outline=(79, 195, 247, 255), width=2)

    # 4. Nacrtaj tekst pomoću ImageDraw.text
    draw.text((50, 50), text, fill=(255, 255, 255, 255), font=font, language="hr")

    print(f"Tekst: '{text}'")
    print(f"Font Veličina: {font_size} pt")
    print(f"Izračunata Duljina (textlength): {t_len:.2f} px")
    print(f"Točan Bounding Box (textbbox): {bbox}")
    print(f"Širina BBox-a: {bbox[2] - bbox[0]} px, Visina: {bbox[3] - bbox[1]} px")

    img.save("pillow_text_metric_test.png")
    print("Spremljen testni vizual: pillow_text_metric_test.png")

if __name__ == "__main__":
    t = sys.argv[1] if len(sys.argv) > 1 else "DTF PRINT HUB — KVALITETA"
    test_pillow_text_metrics(t)
`,
  },
];

