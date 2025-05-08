#!/usr/bin/env python3
import secrets

def generate_jwt_secret(byte_length=64):
    """
    Generate a secure JWT secret token as a hexadecimal string.

    :param byte_length: The number of random bytes to generate.
    :return: A hex string representing the JWT secret.
    """
    return secrets.token_hex(byte_length)

if __name__ == '__main__':
    secret = generate_jwt_secret()
    print("Your generated JWT secret is:")
    print(secret)
