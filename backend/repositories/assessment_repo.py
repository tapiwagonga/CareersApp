from sqlalchemy.orm import Session, joinedload
from .. import models

class AssessmentRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_role_with_requirements(self, role_id: int):
        """
        Fetches the Role AND eager loads its requirements + skill names 
        in a single efficient query.
        """
        return (
            self.db.query(models.Role)
            .options(
                joinedload(models.Role.requirements)
                .joinedload(models.RoleRequirement.skill)
            )
            .filter(models.Role.role_id == role_id)
            .first()
        )