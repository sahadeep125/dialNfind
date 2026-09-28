#!/usr/bin/env python3
"""dialnfind provider discovery CLI. Run `python main.py --help`."""

import sys

if sys.version_info < (3, 12):
    sys.exit("Python 3.12+ is required.")

from dialnfind.cli import main  # noqa: E402

if __name__ == "__main__":
    sys.exit(main())
