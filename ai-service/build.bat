# build.bat (Windows)
@echo off
pip install -r requirements.txt
python scripts/backfill_history.py
echo "✅ Build completo!"
