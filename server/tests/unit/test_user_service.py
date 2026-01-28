import pytest
from bson import ObjectId
from fastapi import HTTPException

from app.services.user_service import UserService


# ----------------------- Add allergens to user tests -----------------------
@pytest.mark.asyncio
async def test_add_allergies(sample_user):
    """
    Ajoute un allergène.
    """
    user = await sample_user
    user_id = user["_id"]
    username = user["username"]
    old_allergies_amount = len(user["allergies"])

    updated_user = await UserService.add_allergies(user_id, ["Milk"])

    assert "Milk" in updated_user.allergies
    assert len(updated_user.allergies) == old_allergies_amount + 1
    assert updated_user.username == username


@pytest.mark.asyncio
async def test_add_multiple_allergies(sample_user):
    """
    Ajoute plusieurs allergènes d’un coup.
    """
    user = await sample_user
    user_id = user["_id"]
    username = user["username"]
    old_allergies_amount = len(user["allergies"])

    updated_user = await UserService.add_allergies(user_id, ["Peanut", "Milk"])

    assert "Peanut" in updated_user.allergies
    assert "Milk" in updated_user.allergies
    assert len(updated_user.allergies) == old_allergies_amount + 2
    assert updated_user.username == username


@pytest.mark.asyncio
async def test_add_duplicated_allergies(sample_user):
    """
    Ajoute deux fois le même allergène.
    """
    user = await sample_user
    user_id = user["_id"]
    username = user["username"]
    old_allergies_amount = len(user["allergies"])

    await UserService.add_allergies(user_id, ["Milk"])
    updated_user = await UserService.add_allergies(user_id, ["Milk"])

    assert "Milk" in updated_user.allergies
    assert len(updated_user.allergies) == old_allergies_amount + 1
    assert updated_user.username == username
    assert updated_user.allergies.count("Milk") == 1


@pytest.mark.asyncio
async def test_add_empty_allergy_list(sample_user):
    """
    Ajout d’une liste vide d’allergènes, ne change rien.
    """
    user = await sample_user
    user_id = user["_id"]
    username = user["username"]
    old_allergies_amount = len(user["allergies"])

    updated_user = await UserService.add_allergies(user_id, [])

    assert len(updated_user.allergies) == old_allergies_amount
    assert updated_user.username == username


@pytest.mark.asyncio
async def test_add_allergy_to_nonexistent_user_raises():
    """
    Ajout à un utilisateur inexistant.
    """
    updated_user = await UserService.add_allergies(str(ObjectId()), ["Milk"])
    assert updated_user is None


# ----------------------- Remove allergens to user tests -----------------------
@pytest.mark.asyncio
async def test_remove_allergy(sample_user):
    """
    Supprime un allergène.
    """
    user = await sample_user
    user_id = user["_id"]
    username = user["username"]

    userResponse = await UserService.add_allergies(user_id, ["Peanut", "Milk"])
    old_allergies_amount = len(userResponse.allergies)

    updated_user = await UserService.remove_allergies(user_id, ["Peanut"])

    assert "Peanut" not in updated_user.allergies
    assert "Milk" in updated_user.allergies
    assert len(updated_user.allergies) == old_allergies_amount - 1
    assert updated_user.username == username


@pytest.mark.asyncio
async def test_remove_multiple_allergies(sample_user):
    """
    Supprime plusieurs allergènes d’un coup.
    """
    user = await sample_user
    user_id = user["_id"]
    username = user["username"]

    userResponse = await UserService.add_allergies(user_id, ["Milk", "Peanut", "Eggs"])
    old_allergies_amount = len(userResponse.allergies)

    updated_user = await UserService.remove_allergies(user_id, ["Peanut", "Eggs"])

    assert "Peanut" not in updated_user.allergies
    assert "Eggs" not in updated_user.allergies
    assert "Milk" in updated_user.allergies
    assert len(updated_user.allergies) == old_allergies_amount - 2
    assert updated_user.username == username


@pytest.mark.asyncio
async def test_remove_allergy_not_in_user(sample_user):
    """
    Supprime un allergène que l’utilisateur n’a pas, ne change rien.
    """
    user = await sample_user
    user_id = user["_id"]
    username = user["username"]

    userResponse = await UserService.add_allergies(user_id, ["Milk"])
    old_allergies_amount = len(userResponse.allergies)

    updated_user = await UserService.remove_allergies(user_id, ["Peanut"])

    assert "Milk" in updated_user.allergies
    assert len(updated_user.allergies) == old_allergies_amount
    assert updated_user.username == username


@pytest.mark.asyncio
async def test_remove_allergies_empty_list(sample_user):
    """
    Supprime une liste vide d’allergènes, ne change rien.
    """
    user = await sample_user
    user_id = user["_id"]
    username = user["username"]

    userResponse = await UserService.add_allergies(user_id, ["Milk"])
    old_allergies_amount = len(userResponse.allergies)

    updated_user = await UserService.remove_allergies(user_id, [])

    assert "Milk" in updated_user.allergies
    assert len(updated_user.allergies) == old_allergies_amount
    assert updated_user.username == username


@pytest.mark.asyncio
async def test_remove_allergy_from_nonexistent_user():
    """
    Supprime un allergène chez un utilisateur inexistant.
    """
    updated_user = await UserService.remove_allergies(str(ObjectId()), ["Milk"])
    assert updated_user is None


@pytest.mark.asyncio
async def test_generate_reset_code():
    code = UserService.generate_reset_code()
    assert len(code) == 6
    assert code.isdigit()


# ----------------------- Generate reset code tests -----------------------
@pytest.mark.asyncio
async def test_generate_reset_code_length():
    """
    Vérifie que le code généré a une longueur de 6.
    """
    code = UserService.generate_reset_code()
    assert len(code) == 6


@pytest.mark.asyncio
async def test_generate_reset_code_is_digit():
    """
    Vérifie que le code généré contient uniquement des chiffres.
    """
    code = UserService.generate_reset_code()
    assert code.isdigit()


@pytest.mark.asyncio
async def test_generate_reset_code_custom_length():
    """
    Vérifie que la longueur personnalisée fonctionne.
    """
    code = UserService.generate_reset_code(length=10)
    assert len(code) == 10
    assert code.isdigit()


@pytest.mark.asyncio
async def test_generate_reset_code_uniqueness():
    """
    Vérifie que deux codes générés sont différents.
    """
    code1 = UserService.generate_reset_code()
    code2 = UserService.generate_reset_code()
    assert code1 != code2


# ----------------------- Request password reset tests -----------------------
@pytest.mark.asyncio
async def test_request_password_reset_success(mock_db, monkeypatch):
    """
    Teste que la demande de réinitialisation de mot de passe réussit.
    """
    # Créer un utilisateur
    user_data = {
        "email": "test@test.com",
        "username": "testuser",
        "first_name": "Test",
        "last_name": "User",
        "hashed_password": "hashed_pw",
        "is_active": True,
        "created_at": "2025-10-31T00:00:00Z",
        "updated_at": None,
        "allergies": [],
    }
    await mock_db["users"].insert_one(user_data)

    # Mock email sender
    monkeypatch.setattr(
        "app.services.user_service.send_reset_email", lambda email, code: True
    )

    result = await UserService.request_password_reset("test@test.com")
    assert result is True

    # Vérifier que le code de réinitialisation a été défini
    user = await mock_db["users"].find_one({"email": "test@test.com"})
    assert "reset_code" in user
    assert "reset_expires" in user
    assert len(user["reset_code"]) == 6


@pytest.mark.asyncio
async def test_request_password_reset_user_not_found(mock_db, monkeypatch):
    """
    Teste que la demande échoue si l'utilisateur n'existe pas.
    """
    monkeypatch.setattr(
        "app.services.user_service.send_reset_email", lambda email, code: True
    )

    result = await UserService.request_password_reset("nonexistent@test.com")
    assert result is False


@pytest.mark.asyncio
async def test_request_password_reset_email_sent(mock_db, monkeypatch):
    """
    Teste que l'email est bien envoyé lors de la demande.
    """
    user_data = {
        "email": "test@test.com",
        "username": "testuser",
        "first_name": "Test",
        "last_name": "User",
        "hashed_password": "hashed_pw",
        "is_active": True,
        "created_at": "2025-10-31T00:00:00Z",
        "updated_at": None,
        "allergies": [],
    }
    await mock_db["users"].insert_one(user_data)

    email_sent = []

    def mock_send_email(email, code):
        email_sent.append({"email": email, "code": code})

    monkeypatch.setattr("app.services.user_service.send_reset_email", mock_send_email)

    await UserService.request_password_reset("test@test.com")
    assert len(email_sent) == 1
    assert email_sent[0]["email"] == "test@test.com"
    assert len(email_sent[0]["code"]) == 6


# ----------------------- Reset password tests -----------------------
@pytest.mark.asyncio
async def test_reset_password_success(mock_db):
    """
    Teste que la réinitialisation du mot de passe réussit avec un code valide.
    """
    from datetime import datetime, timedelta, timezone

    # Créer un utilisateur avec un code de réinitialisation
    hashed_pw = UserService.hash_password("oldpassword123")
    code = UserService.generate_reset_code()
    expires = (datetime.now(timezone.utc) + timedelta(minutes=15)).isoformat()

    user_data = {
        "email": "test@test.com",
        "username": "testuser",
        "first_name": "Test",
        "last_name": "User",
        "hashed_password": hashed_pw,
        "is_active": True,
        "created_at": "2025-10-31T00:00:00Z",
        "updated_at": None,
        "allergies": [],
        "reset_code": code,
        "reset_expires": expires,
    }
    await mock_db["users"].insert_one(user_data)

    # Réinitialiser le mot de passe
    result = await UserService.reset_password("test@test.com", code, "newpassword123")
    assert result is True

    # Vérifier que le mot de passe a changé
    user = await mock_db["users"].find_one({"email": "test@test.com"})
    assert UserService.verify_password("newpassword123", user["hashed_password"])
    assert not UserService.verify_password("oldpassword123", user["hashed_password"])

    # Vérifier que le code de réinitialisation a été supprimé
    assert "reset_code" not in user or user.get("reset_code") == ""
    assert "reset_expires" not in user or user.get("reset_expires") == ""


@pytest.mark.asyncio
async def test_reset_password_invalid_code(mock_db):
    """
    Teste que la réinitialisation échoue avec un code invalide.
    """
    from datetime import datetime, timedelta, timezone

    code = UserService.generate_reset_code()
    expires = (datetime.now(timezone.utc) + timedelta(minutes=15)).isoformat()

    user_data = {
        "email": "test@test.com",
        "username": "testuser",
        "first_name": "Test",
        "last_name": "User",
        "hashed_password": "hashed_pw",
        "is_active": True,
        "created_at": "2025-10-31T00:00:00Z",
        "updated_at": None,
        "allergies": [],
        "reset_code": code,
        "reset_expires": expires,
    }
    await mock_db["users"].insert_one(user_data)

    result = await UserService.reset_password(
        "test@test.com", "wrongcode", "newpassword123"
    )
    assert result is False


@pytest.mark.asyncio
async def test_reset_password_expired_code(mock_db):
    """
    Teste que la réinitialisation échoue avec un code expiré.
    """
    from datetime import datetime, timedelta, timezone

    code = UserService.generate_reset_code()
    expires = (
        datetime.now(timezone.utc) - timedelta(minutes=20)
    ).isoformat()  # Code expiré

    user_data = {
        "email": "test@test.com",
        "username": "testuser",
        "first_name": "Test",
        "last_name": "User",
        "hashed_password": "hashed_pw",
        "is_active": True,
        "created_at": "2025-10-31T00:00:00Z",
        "updated_at": None,
        "allergies": [],
        "reset_code": code,
        "reset_expires": expires,
    }
    await mock_db["users"].insert_one(user_data)

    result = await UserService.reset_password("test@test.com", code, "newpassword123")
    assert result is False


@pytest.mark.asyncio
async def test_reset_password_user_not_found(mock_db):
    """
    Teste que la réinitialisation échoue si l'utilisateur n'existe pas.
    """
    result = await UserService.reset_password(
        "nonexistent@test.com", "123456", "newpassword123"
    )
    assert result is False


@pytest.mark.asyncio
async def test_reset_password_no_reset_fields(mock_db):
    """
    Teste que la réinitialisation échoue si les champs de réinitialisation n'existent pas.
    """
    user_data = {
        "email": "test@test.com",
        "username": "testuser",
        "first_name": "Test",
        "last_name": "User",
        "hashed_password": "hashed_pw",
        "is_active": True,
        "created_at": "2025-10-31T00:00:00Z",
        "updated_at": None,
        "allergies": [],
    }
    await mock_db["users"].insert_one(user_data)

    result = await UserService.reset_password(
        "test@test.com", "123456", "newpassword123"
    )
    assert result is False


# ----------------------- Authenticate user tests -----------------------
@pytest.mark.asyncio
async def test_authenticate_user_success(mock_db):
    """
    Teste que l'authentification réussit avec le bon mot de passe.
    """
    password = "testpassword123"
    hashed_pw = UserService.hash_password(password)

    user_data = {
        "email": "test@test.com",
        "username": "testuser",
        "first_name": "Test",
        "last_name": "User",
        "hashed_password": hashed_pw,
        "is_active": True,
        "created_at": "2025-10-31T00:00:00Z",
        "updated_at": None,
        "allergies": [],
    }
    await mock_db["users"].insert_one(user_data)

    token = await UserService.authenticate_user("test@test.com", password)
    assert token is not None
    assert isinstance(token, str)
    assert len(token) > 0


@pytest.mark.asyncio
async def test_authenticate_user_wrong_password(mock_db):
    """
    Teste que l'authentification échoue avec un mauvais mot de passe.
    """
    password = "testpassword123"
    hashed_pw = UserService.hash_password(password)

    user_data = {
        "email": "test@test.com",
        "username": "testuser",
        "first_name": "Test",
        "last_name": "User",
        "hashed_password": hashed_pw,
        "is_active": True,
        "created_at": "2025-10-31T00:00:00Z",
        "updated_at": None,
        "allergies": [],
    }
    await mock_db["users"].insert_one(user_data)

    token = await UserService.authenticate_user("test@test.com", "wrongpassword")
    assert token is None


@pytest.mark.asyncio
async def test_authenticate_user_user_not_found(mock_db):
    """
    Teste que l'authentification échoue si l'utilisateur n'existe pas.
    """
    token = await UserService.authenticate_user("nonexistent@test.com", "anypassword")
    assert token is None


@pytest.mark.asyncio
async def test_authenticate_user_token_contains_email(mock_db):
    """
    Teste que le token contient l'email de l'utilisateur.
    """
    password = "testpassword123"
    hashed_pw = UserService.hash_password(password)

    user_data = {
        "email": "test@test.com",
        "username": "testuser",
        "first_name": "Test",
        "last_name": "User",
        "hashed_password": hashed_pw,
        "is_active": True,
        "created_at": "2025-10-31T00:00:00Z",
        "updated_at": None,
        "allergies": [],
    }
    await mock_db["users"].insert_one(user_data)

    token = await UserService.authenticate_user("test@test.com", password)
    decoded = UserService.decode_access_token(token)
    assert decoded is not None
    assert decoded["email"] == "test@test.com"


# ----------------------- Create user tests -----------------------
@pytest.mark.asyncio
async def test_create_user_success(mock_db):
    """
    Teste que la création d'un utilisateur réussit.
    """
    from app.schemas.user import UserCreate

    user_create = UserCreate(
        email="newuser@test.com",
        username="newuser",
        first_name="New",
        last_name="User",
        password="newpassword123",
    )

    created_user = await UserService.create_user(user_create)

    assert created_user.email == "newuser@test.com"
    assert created_user.username == "newuser"
    assert created_user.first_name == "New"
    assert created_user.last_name == "User"
    assert created_user.is_active is True
    assert created_user.allergies == []
    assert created_user.id is not None


@pytest.mark.asyncio
async def test_create_user_password_hashed(mock_db):
    """
    Teste que le mot de passe de l'utilisateur est bien hashé.
    """
    from app.schemas.user import UserCreate

    user_create = UserCreate(
        email="newuser@test.com",
        username="newuser",
        first_name="New",
        last_name="User",
        password="newpassword123",
    )

    await UserService.create_user(user_create)

    user = await mock_db["users"].find_one({"email": "newuser@test.com"})
    assert user["hashed_password"] != "newpassword123"
    assert UserService.verify_password("newpassword123", user["hashed_password"])


@pytest.mark.asyncio
async def test_create_user_can_authenticate(mock_db):
    """
    Teste que l'utilisateur créé peut se connecter.
    """
    from app.schemas.user import UserCreate

    user_create = UserCreate(
        email="newuser@test.com",
        username="newuser",
        first_name="New",
        last_name="User",
        password="newpassword123",
    )

    await UserService.create_user(user_create)

    token = await UserService.authenticate_user("newuser@test.com", "newpassword123")
    assert token is not None


@pytest.mark.asyncio
async def test_create_user_timestamps(mock_db):
    """
    Teste que les timestamps de création sont définis.
    """
    from app.schemas.user import UserCreate

    user_create = UserCreate(
        email="newuser@test.com",
        username="newuser",
        first_name="New",
        last_name="User",
        password="newpassword123",
    )

    created_user = await UserService.create_user(user_create)

    assert created_user.created_at is not None
    assert created_user.updated_at is None


@pytest.mark.asyncio
async def test_create_user_default_allergies(mock_db):
    """
    Teste que la liste d'allergies par défaut est vide.
    """
    from app.schemas.user import UserCreate

    user_create = UserCreate(
        email="newuser@test.com",
        username="newuser",
        first_name="New",
        last_name="User",
        password="newpassword123",
    )

    created_user = await UserService.create_user(user_create)

    assert created_user.allergies == []


@pytest.mark.asyncio
async def test_create_user_unique_ids(mock_db):
    """
    Teste que chaque utilisateur créé a un ID unique.
    """
    from app.schemas.user import UserCreate

    user_create1 = UserCreate(
        email="user1@test.com",
        username="user1",
        first_name="User",
        last_name="One",
        password="password123",
    )

    user_create2 = UserCreate(
        email="user2@test.com",
        username="user2",
        first_name="User",
        last_name="Two",
        password="password123",
    )

    created_user1 = await UserService.create_user(user_create1)
    created_user2 = await UserService.create_user(user_create2)

    assert created_user1.id != created_user2.id
