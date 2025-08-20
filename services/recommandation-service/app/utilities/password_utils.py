from passlib.context import CryptContext


bcrypt_context = CryptContext(schemes=['bcrypt'], bcrypt__rounds=12)#, deprecated='auto'

def get_password_hash(password: str) -> str:
    return bcrypt_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    test = bcrypt_context.verify(plain_password, hashed_password)
    print("verify_password: ", test)
    return test

