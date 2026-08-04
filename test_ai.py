from backend.ai import get_fallback_definition
import traceback

def test():
    try:
        res = get_fallback_definition('VERNE')
        print("Result:", res)
    except Exception as e:
        traceback.print_exc()

if __name__ == '__main__':
    test()
