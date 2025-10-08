from datetime import UTC, datetime

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.database.database import Base
from app.models.user import User


@pytest.fixture(scope="function")
def test_db():
    engine = create_engine("sqlite:///:memory:")
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    yield db
    db.close()


def test_create_user(test_db):
    user = User(
        email="test@example.com",
        username="testuser",
        hashed_password="hashed_pwd",
        first_name="John",
        last_name="Doe",
        is_active=True,
        created_at=datetime.now(UTC),
        updated_at=datetime.now(UTC),
    )
    test_db.add(user)
    test_db.commit()
    test_db.refresh(user)
    assert user.id is not None
    assert user.username == "testuser"


def test_user_count(test_db):
    user1 = User(
        email="user1@example.com",
        username="user1",
        hashed_password="pwd1",
        first_name="Alice",
        last_name="Smith",
        is_active=True,
        created_at=datetime.now(UTC),
        updated_at=datetime.now(UTC),
    )
    user2 = User(
        email="user2@example.com",
        username="user2",
        hashed_password="pwd2",
        first_name="Bob",
        last_name="Brown",
        is_active=True,
        created_at=datetime.now(UTC),
        updated_at=datetime.now(UTC),
    )
    test_db.add_all([user1, user2])
    test_db.commit()
    count = test_db.query(User).count()
    assert count == 2
