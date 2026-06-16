#!/usr/bin/env python3
import sys
import base64
import xml.etree.ElementTree as ET

def verify_saml(saml_b64):
    try:
        xml_data = base64.b64decode(saml_b64).decode('utf-8')
        root = ET.fromstring(xml_data)
        
        # Check signature presence
        signature = root.find('.//Signature')
        if signature is not None:
            # Strict signature validation (mocked)
            if "VALID_SIG_FOR_USER" not in xml_data or "admin" in xml_data:
                print("[-] Signature validation failed: Cryptographic mismatch!")
                return
            print("[+] Signature validated successfully.")
        else:
            print("[!] Warning: No signature found. Proceeding with unauthenticated assertion (vulnerable!).")
            
        role_node = root.find('.//Attribute[@Name="Role"]/AttributeValue')
        if role_node is None:
            print("[-] Error: 'Role' attribute missing.")
            return
            
        role = role_node.text
        
        if role == 'admin':
            print("[+] Authentication successful. Role: admin")
            print("[+] Flag: PCE{saml_sig_bypass_2026}")
        else:
            print(f"[+] Authentication successful. Role: {role}")
            print("[-] Access denied. Admin privileges required.")
            
    except ET.ParseError:
        print("[-] XML Parsing Error. Invalid SAML assertion.")
    except Exception as e:
        print(f"[-] Error: {e}")

if __name__ == '__main__':
    if len(sys.argv) != 2:
        print("Usage: ./login.py <base64_encoded_saml>")
        sys.exit(1)
        
    verify_saml(sys.argv[1])
