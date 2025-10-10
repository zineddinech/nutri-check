import argparse
import csv
import os
import time

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database.database import Base, SessionLocal, engine
from app.models.product import Product

csv.field_size_limit(100_000_000)


# Stores the time of the last database sync
SYNC_FILE = "app/scripts/last_sync.txt"


def read_last_sync():
    if not os.path.exists(SYNC_FILE):
        return 0
    with open(SYNC_FILE, "r") as f:
        return int(f.read().strip() or 0)


def write_last_sync(timestamp):
    with open(SYNC_FILE, "w") as f:
        f.write(str(timestamp))


def _parse_float(value):
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def import_openfoodfacts(csv_path: str, limit: int | None = None):
    if not os.path.exists(csv_path):
        print(f"File not found : {csv_path}")
        return

    Base.metadata.create_all(bind=engine)
    db: Session = SessionLocal()

    last_sync = read_last_sync()
    print(
        f"Last sync : {time.strftime('%Y-%m-%d %H:%M:%S', time.localtime(last_sync))}"
    )

    count = 0
    inserted, updated, skipped = 0, 0, 0
    max_timestamp = last_sync

    with open(csv_path, encoding="utf-8") as f:
        reader = csv.DictReader(f, delimiter="\t")

        for row in reader:
            count += 1
            if limit and count > limit:
                break

            try:
                modified_t = int(row.get("last_modified_t") or 0)
            except ValueError:
                continue

            if modified_t <= last_sync:
                skipped += 1
                continue

            code = row.get("code")
            if not code:
                continue

            existing = db.execute(
                select(Product).where(Product.code == code)
            ).scalar_one_or_none()

            if existing and existing.last_modified_t >= modified_t:
                skipped += 1
                continue

            if existing:
                # corriger le "type: ignore" pour mypy eventuellement
                existing.product_name = row.get("product_name")  # type: ignore
                existing.brands = row.get("brands")  # type: ignore
                existing.categories = row.get("categories")  # type: ignore
                existing.nutriscore_grade = row.get("nutriscore_grade")  # type: ignore
                existing.energy_100g = _parse_float(row.get("energy_100g"))
                existing.fat_100g = _parse_float(row.get("fat_100g"))
                existing.sugars_100g = _parse_float(row.get("sugars_100g"))
                existing.proteins_100g = _parse_float(row.get("proteins_100g"))
                existing.salt_100g = _parse_float(row.get("salt_100g"))
                existing.last_modified_t = modified_t  # type: ignore
                updated += 1
            else:
                product = Product(
                    code=code,
                    product_name=row.get("product_name"),
                    brands=row.get("brands"),
                    categories=row.get("categories"),
                    nutriscore_grade=row.get("nutriscore_grade"),
                    energy_100g=_parse_float(row.get("energy_100g")),
                    fat_100g=_parse_float(row.get("fat_100g")),
                    sugars_100g=_parse_float(row.get("sugars_100g")),
                    proteins_100g=_parse_float(row.get("proteins_100g")),
                    salt_100g=_parse_float(row.get("salt_100g")),
                    last_modified_t=modified_t,
                )
                db.add(product)
                db.flush()
                inserted += 1

            if modified_t > max_timestamp:
                max_timestamp = modified_t

            if count % 1000 == 0:
                db.commit()
                db.expunge_all()
                print(
                    f"{count} lines treated — {inserted} products added — {updated} products updated — {skipped} products skipped"
                )

        db.commit()

    db.close()
    if not limit:
        write_last_sync(max_timestamp)

    print(
        f"Done. Last sync update : {time.strftime('%Y-%m-%d %H:%M:%S', time.localtime(max_timestamp))}"
    )
    print(
        f"Summary : {inserted} products added — {updated} products updated — {skipped} products skipped"
    )


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Import OpenFoodFacts database with update detection"
    )
    parser.add_argument("csv_path", help="Path to OpenFoodFacts csv file")
    parser.add_argument(
        "--limit",
        type=int,
        default=None,
        help="Maximum amount of lines to read (for tests)",
    )
    args = parser.parse_args()

    import_openfoodfacts(args.csv_path, limit=args.limit)
