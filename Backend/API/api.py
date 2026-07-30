from Backend.Database.signed_Document_DB import Store_Signed_Doc
from pydantic import BaseModel
import sys
import os
from pymongo import AsyncMongoClient
from dotenv import load_dotenv,find_dotenv
from beanie import Document, init_beanie
from datetime import datetime
from fastapi import FastAPI, File, UploadFile, Form
import fitz
from io import BytesIO

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
# Environment variables
load_dotenv(find_dotenv())
password = os.environ.get("DB_PSWRD")
user_name = os.environ.get("DB_USRNM")

app = FastAPI(
    title="Document Signing API",
    version="1.0.0",
    description="A simple API to upload and sign documents")

class Doc(BaseModel):
    email: str
    document_name: str
    content: bytes

@app.post("/sign")
async def sign_doc( email: str = Form(...),
    signature: str = Form(...),
    page: int = Form(...),
    x: float = Form(...),
    y:float = Form(...),file: UploadFile = File(...)):

    try:

        bytePDF = await file.read()
        document: fitz = fitz.open_stream(bytePDF,filetype="pdf")

        #Signature placement

        signed_doc = BytesIO()
        document.save(signed_doc)
        document.close()

        signed_content = signed_doc.getvalue()

        await Store_Signed_Doc(
            Dname = str(file.filename),
            Dcontent = signed_content
        )
    except Exception as e:
        print(e)
        return {"error": str(e)}

class Documents(Document):
    email: str
    document_name: str
    content: bytes
    uploaded_at: datetime = datetime.now()

@app.post("/upload")
async def Store_Doc(file: UploadFile = File(...),
    email: str = Form(...)):
     client :AsyncMongoClient = AsyncMongoClient(f"mongodb+srv://{user_name}:{password}@imscluster.mhsw47k.mongodb.net/")

     await init_beanie(database=client["DocumentDB"], document_models=[Documents])
     content = await file.read()

    # Save to database
     doc = Documents(
        email=email,
        document_name=file.filename,
        content=content
    )
     await doc.insert()
