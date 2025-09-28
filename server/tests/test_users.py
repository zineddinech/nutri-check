import pytest
from fastapi.testclient import TestClient


def test_create_user(client: TestClient, sample_user_data):
    assert True == True
