#mock credit bureau data
import random


PASS_GRADES = ["AA", "BB", "CC", "DD", "EE", "FF", "GG"]
FAIL_GRADES = ["GG", "HH", "HX", "HZ"]


class CreditBureauClient:
    """
    Mock Credit Bureau API.
    """

    def fetch_report(self, app_record):

        grade = random.choice(PASS_GRADES + FAIL_GRADES)

        return {
            "risk_grade": grade,
            "passed": grade in PASS_GRADES
        }