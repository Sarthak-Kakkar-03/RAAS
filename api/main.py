from fastapi import FastAPI, UploadFile, File, HTTPException
from pathlib import Path
import shutil

from fastapi.concurrency import run_in_threadpool

DATA_DIR = Path("data")
RAW_DIR = DATA_DIR / "raw"
RAW_DIR.mkdir(parents=True, exist_ok=True)

# Initialize fast api app
# Skeleton for now
app = FastAPI()

@app.get("/health")
def health():
    return {
        "status": "ok"
    }
    
@app.post("/retrieve")    
def retrieve(query: dict):
    return {
        "results":
            [
                {"text": "placeholder chunk", 
                 "score": 0.9}
            ]
    }
    
@app.post("/files/upload")
async def upload_file(file: UploadFile = File(...)):
    try:
        if not file.filename:
            raise HTTPException(status_code=400, detail="Missing filename")

        safe_name = Path(file.filename).name
        if safe_name in {"", ".", ".."}:
            raise HTTPException(status_code=400, detail="Invalid filename")
        out_path = RAW_DIR / safe_name

        def _write_upload(src, dst):
            with dst.open("wb") as f:
                shutil.copyfileobj(src, f)

        await run_in_threadpool(_write_upload, file.file, out_path)
        return {"filename": file.filename, "saved_to": str(out_path)}
    finally:
        await file.close()
