from sqlalchemy import Column, Float, Integer, String

from app.database.database import Base


class Product(Base):
    __tablename__ = "products"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    code = Column(String, unique=True, index=True)  # Code-barres
    product_name = Column(String, index=True)
    brands = Column(String, index=True)
    categories = Column(String, index=True)
    nutriscore_grade = Column(String(1))
    energy_100g = Column(Float)
    fat_100g = Column(Float)
    sugars_100g = Column(Float)
    proteins_100g = Column(Float)
    salt_100g = Column(Float)
    last_modified_t = Column(Integer, index=True)
