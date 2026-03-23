# CSV Test Data Files

This directory contains sample CSV files for testing the CSV import functionality.

## Valid CSV Files

### sample_basic_4_records.csv
Basic valid CSV with 4 payment records. Use for basic functionality testing.

### sample_japanese_employee_ids.csv
CSV with Japanese characters in employee IDs. Use for UTF-8 encoding testing.

### sample_edge_case_amounts.csv
CSV with various amount formats (very small, very large, high precision). Use for decimal precision testing.

## Invalid CSV Files

### test_invalid_address.csv
CSV with invalid Ethereum addresses. Expected to fail with address validation errors.

### test_invalid_amount.csv
CSV with invalid amounts (text, negative, zero, empty). Expected to fail with amount validation errors.

### test_invalid_empty.csv
Empty CSV file. Expected to fail with "empty file" error.

## Usage

1. Import these files through the application's CSV import feature
2. Verify expected behavior (success or error) for each file
3. Check error messages match expected format
4. Verify data integrity for successful imports

## Generating Large Test Files

To generate a large CSV file with 1000 records, use the Python script:

```python
import csv

addresses = [
    "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
    "0x5B38Da6a701c568545dCfcB03FcB875f56beddC4",
    "0xAb8483F64d9C6d1EcF9b849Ae677dD3315835cb2",
    "0x4B20993Bc481177ec7E8f571ceCaE8A9e22C02db",
    "0x78731D3Ca6b7E34aC0F824c42a7cC18A495cabaB"
]

tokens = ["USDC", "USDT", "DAI"]

with open('sample_large_1000_records.csv', 'w', newline='', encoding='utf-8') as f:
    writer = csv.writer(f)
    writer.writerow(['recipientAddress', 'tokenSymbol', 'amount', 'employeeId'])
    
    for i in range(1000):
        address = addresses[i % len(addresses)]
        token = tokens[i % len(tokens)]
        amount = round(100 + (i * 10.5), 2)
        employee_id = f"EMP{i+1:04d}"
        writer.writerow([address, token, amount, employee_id])

print("Generated sample_large_1000_records.csv with 1000 records")
```

Save this as `generate_large_csv.py` and run:
```bash
python generate_large_csv.py
```

## Test Coverage

These test files cover:
- ✅ Valid CSV formats
- ✅ Invalid address formats
- ✅ Invalid amount formats
- ✅ UTF-8 encoding (Japanese characters)
- ✅ Edge case amounts (very small, very large)
- ✅ Empty files
- ✅ Large files (via generation script)

For complete test documentation, see `TASK_38.3_CSV_IMPORT_VALIDATION_TESTING.md`.
