import os

from beanie import Document as Doc
from beanie import init_beanie
from dotenv import find_dotenv, load_dotenv
from pymongo import AsyncMongoClient

load_dotenv(find_dotenv())
password = os.environ.get("DB_PSWRD")
user_name = os.environ.get("DB_USRNM")


class Document(Doc):
    document_name: str
    content: bytes


async def Store_Signed_Doc(Dname: str, Dcontent: bytes):
    client: AsyncMongoClient = AsyncMongoClient(
        f"mongodb+srv://{user_name}:{password}@imscluster.mhsw47k.mongodb.net/"
    )

    await init_beanie(database=client["DocumentDB"], document_models=[Document])

    updates: dict = {}
    updates["content"] = Dcontent
    document = await Document.find_one({"document_name": Dname})
    if document:
        await document.update({"$set": updates})
        print("Document updated:", document.document_name)
