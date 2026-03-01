from langchain_text_splitters import RecursiveCharacterTextSplitter
from typing import List


def chunk_text(text: str, chunk_size: int = 600, chunk_overlap: int = 80) -> List[str]:
    splitter = RecursiveCharacterTextSplitter.from_tiktoken_encoder(
        chunk_size=chunk_size, chunk_overlap=chunk_overlap
    )

    return splitter.split_text(text=text)
