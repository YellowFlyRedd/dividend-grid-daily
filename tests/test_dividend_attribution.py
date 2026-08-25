import unittest
from datetime import datetime

from scripts.refresh_dashboard import report_cycle


class DividendAttributionTests(unittest.TestCase):
    def test_single_august_payment_stays_with_prior_annual_report(self):
        self.assertEqual(report_cycle(datetime(2022, 8, 23))[0:2], (2021, "annual"))

    def test_last_august_payment_after_annual_payment_is_interim(self):
        self.assertEqual(
            report_cycle(datetime(2026, 8, 31), events_in_year=2, is_latest=True)[0:2],
            (2026, "interim"),
        )

    def test_september_payment_is_interim(self):
        self.assertEqual(report_cycle(datetime(2025, 9, 3))[0:2], (2025, "interim"))


if __name__ == "__main__":
    unittest.main()
