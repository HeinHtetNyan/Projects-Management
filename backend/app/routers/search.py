from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Project, Customer, Secret, Domain, Server, Integration, Note, AdminUser
from ..auth import get_current_user
from ..schemas import SearchResults

router = APIRouter(prefix="/api/search", tags=["search"])


@router.get("", response_model=SearchResults)
async def search(
    q: str = "",
    db: Session = Depends(get_db),
    _: AdminUser = Depends(get_current_user),
):
    if not q.strip():
        return SearchResults()

    like = f"%{q.strip()}%"
    return SearchResults(
        projects=db.query(Project).filter(
            (Project.name.ilike(like)) | (Project.slug.ilike(like)) | (Project.description.ilike(like))
        ).limit(10).all(),
        customers=db.query(Customer).filter(
            (Customer.name.ilike(like)) | (Customer.company_name.ilike(like)) | (Customer.email.ilike(like))
        ).limit(10).all(),
        secrets=db.query(Secret).filter(
            (Secret.name.ilike(like)) | (Secret.category.ilike(like))
        ).limit(10).all(),
        domains=db.query(Domain).filter(Domain.domain.ilike(like)).limit(10).all(),
        servers=db.query(Server).filter(
            (Server.name.ilike(like)) | (Server.provider.ilike(like)) | (Server.ip_address.ilike(like))
        ).limit(10).all(),
        integrations=db.query(Integration).filter(
            (Integration.service.ilike(like)) | (Integration.account.ilike(like))
        ).limit(10).all(),
        notes=db.query(Note).filter(
            (Note.title.ilike(like)) | (Note.content.ilike(like)) | (Note.tags.ilike(like))
        ).limit(10).all(),
    )
