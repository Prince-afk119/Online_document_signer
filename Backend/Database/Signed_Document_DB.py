from beanie import init_beanie, Document as Doc
from dotenv import load_dotenv, find_dotenv
from pymongo import AsyncMongoClient
import os

load_dotenv(find_dotenv())
password = os.environ.get("DB_PSWRD")
user_name = os.environ.get("DB_USRNM")

class Document(Doc):
    document_name: str
    content: bytes


async def Store_Signed_Doc(Dname: str,Dcontent:bytes):
     client :AsyncMongoClient = AsyncMongoClient(f"mongodb+srv://{user_name}:{password}@imscluster.mhsw47k.mongodb.net/")

     await init_beanie(database=client["DocumentDB"], document_models=[Document])

     updates: dict = {}
     updates["content"] = Dcontent
     document = await Document.find_one({"document_name":Dname})
     if document:
         await document.update({"$set": updates})
         print("Document updated:", document.document_name)
