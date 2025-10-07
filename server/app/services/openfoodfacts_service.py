from openfoodfacts import API, APIVersion, Country, Environment, Flavor

# Crée l'objet API
api = API(
    user_agent="test",
    country=Country.world,
    flavor=Flavor.off,
    version=APIVersion.v2,
    environment=Environment.org,
)


def search_products(query: str, page: int = 1, page_size: int = 10):
    results = api.product.text_search(query=query, page=page, page_size=page_size)
    products = results.get("products", [])

    simplified_products = []
    for p in products:
        simplified_products.append(
            {
                "product_name": p.get("product_name", "Inconnu"),
                "brands": p.get("brands", "Inconnu"),
                "nutriscore": p.get("nutriscore_grade", "e"),
                "url": p.get("url", ""),
            }
        )
    return simplified_products
