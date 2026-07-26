"""
AnimalMind — Production Metrics Reporter & Daily Audit Summary
===============================================================
Generates daily analytical reports in Markdown from feedback database.

Usage:
  python -m utils.metrics_reporter
"""

import datetime
import json
import pathlib
import sqlite3
from typing import Dict, List, Any


def generate_daily_report(db_path: str = None) -> str:
    if db_path is None:
        db_path = str(pathlib.Path(__file__).parent.parent / "feedback.db")

    reports_dir = pathlib.Path(__file__).parent.parent / "reports"
    reports_dir.mkdir(parents=True, exist_ok=True)

    today_str = datetime.datetime.now().strftime("%Y-%m-%d")
    report_file = reports_dir / f"daily_report_{today_str}.md"

    conn = sqlite3.connect(db_path)
    try:
        cursor = conn.cursor()
        
        # Check if table exists
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='model_feedback'")
        if not cursor.fetchone():
            content = f"# AnimalMind Production Metrics Report — {today_str}\n\nNo `model_feedback` table found in database yet."
            report_file.write_text(content, encoding="utf-8")
            return content

        cursor.execute("SELECT COUNT(*), SUM(is_correct) FROM model_feedback")
        row = cursor.fetchone()
        total_feedbacks = row[0] or 0
        correct_count = row[1] or 0
        incorrect_count = total_feedbacks - correct_count

        error_rate = (incorrect_count / total_feedbacks * 100.0) if total_feedbacks > 0 else 0.0
        accuracy = (correct_count / total_feedbacks * 100.0) if total_feedbacks > 0 else 100.0

        # Incorrect feedback by breed
        cursor.execute(
            """
            SELECT prediction, COUNT(*) as err_cnt 
            FROM model_feedback 
            WHERE is_correct = 0 
            GROUP BY prediction 
            ORDER BY err_cnt DESC 
            LIMIT 10
            """
        )
        top_errors = cursor.fetchall()

        # Count feedback entries with attached images
        cursor.execute("SELECT COUNT(*) FROM model_feedback WHERE image_path IS NOT NULL AND image_path != ''")
        with_images_cnt = cursor.fetchone()[0] or 0

        # Alert status
        alert_flag = "🚨 **ALERT**: Error rate is above 20%! Model recalibration or retraining advised." if error_rate > 20.0 else "✅ **NORMAL**: Performance metrics within healthy parameters."

        report_lines = [
            f"# 🐾 AnimalMind Daily Production Metrics Report — {today_str}",
            "",
            f"**Report Generated**: {datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')}",
            f"**Status**: {alert_flag}",
            "",
            "## 📈 High-Level Summary",
            "",
            f"- **Total Feedbacks Collected**: `{total_feedbacks}`",
            f"- **Correct Predictions**: `{correct_count}` ({accuracy:.1f}%)",
            f"- **Incorrect Predictions**: `{incorrect_count}` ({error_rate:.1f}%)",
            f"- **Feedbacks with Attached Images**: `{with_images_cnt}`",
            "",
            "## 🔍 Top Misclassified Breeds (User Corrected)",
            "",
        ]

        if top_errors:
            report_lines.append("| Predicted Breed | Error Count |")
            report_lines.append("|-----------------|-------------|")
            for breed, count in top_errors:
                report_lines.append(f"| {breed} | {count} |")
        else:
            report_lines.append("No misclassifications recorded today.")

        report_content = "\n".join(report_lines)
        report_file.write_text(report_content, encoding="utf-8")
        print(f"[MetricsReporter] Daily report written to {report_file}")
        return report_content

    finally:
        conn.close()


if __name__ == "__main__":
    generate_daily_report()
