"""
Advanced Document Ingestion Pipeline
Features: Unit Normalization, Metadata Injection, LlamaParse Integration
"""
import os
import re
from llama_parse import LlamaParse
from llama_index.core import VectorStoreIndex, StorageContext, SimpleDirectoryReader, Document
from llama_index.vector_stores.pinecone import PineconeVectorStore
from pinecone import Pinecone, ServerlessSpec
from app.config import init_settings, CHUNK_SIZE, CHUNK_OVERLAP

init_settings()


def normalize_units(text: str) -> str:
    """Clean up unit variations for more accurate search"""
    text = text.replace("watt peak", "Wp").replace("Watt Peak", "Wp")
    text = text.replace("kilowatt hour", "kWh").replace("Kwh", "kWh")
    text = text.replace("Ampere hour", "Ah")
    # Remove double spaces
    text = re.sub(r'\s+', ' ', text).strip()
    return text


def build_index(data_dir="data"):
    """Build and populate Pinecone index with documents"""
    print("🚀 Starting Production Ingestion...")

    # 1. Setup Pinecone
    pc = Pinecone(api_key=os.getenv("PINECONE_API_KEY"))
    index_name = os.getenv("PINECONE_INDEX_NAME")

    if index_name not in pc.list_indexes().names():
        print(f"📦 Creating Index: {index_name}")
        pc.create_index(
            name=index_name,
            dimension=1024,
            metric='cosine',
            spec=ServerlessSpec(cloud='aws', region='us-east-1')
        )

    pinecone_index = pc.Index(index_name)
    vector_store = PineconeVectorStore(pinecone_index=pinecone_index)

    # 2. Parsing with LlamaParse
    parser = LlamaParse(result_type="markdown", verbose=True)
    file_extractor = {".pdf": parser}
    raw_docs = SimpleDirectoryReader(
        input_dir=data_dir,
        file_extractor=file_extractor
    ).load_data()

    # 3. Pre-processing & Normalization
    cleaned_docs = []
    for doc in raw_docs:
        # Normalize text
        original_text = doc.text
        cleaned_text = normalize_units(original_text)

        # Create new metadata dict
        new_metadata = dict(doc.metadata)
        new_metadata["source_type"] = "technical_manual" if "manual" in \
            new_metadata.get("file_name", "").lower() else "general"
        new_metadata["processed_at"] = "v2.0"

        # Create new Document with cleaned text and updated metadata
        cleaned_doc = Document(
            text=cleaned_text,
            metadata=new_metadata
        )
        cleaned_docs.append(cleaned_doc)

    # 4. Upload to Pinecone (StorageContext handles chunking automatically via Settings)
    storage_context = StorageContext.from_defaults(vector_store=vector_store)
    print(f"☁️ Uploading {len(cleaned_docs)} documents...")
    VectorStoreIndex.from_documents(
        cleaned_docs,
        storage_context=storage_context,
        show_progress=True
    )
    print("✅ Ingestion Complete.")


if __name__ == "__main__":
    build_index()
