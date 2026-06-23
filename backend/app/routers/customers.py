from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Customer, AdminUser
from ..auth import get_current_user, log_action, get_client_ip
from ..schemas import CustomerOut, CustomerCreate, CustomerUpdate, MessageResponse

router = APIRouter(prefix="/api/customers", tags=["customers"])


@router.get("", response_model=list[CustomerOut])
async def list_customers(
    db: Session = Depends(get_db),
    _: AdminUser = Depends(get_current_user),
):
    return db.query(Customer).order_by(Customer.created_at.desc()).all()


@router.post("", response_model=CustomerOut, status_code=201)
async def create_customer(
    body: CustomerCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: AdminUser = Depends(get_current_user),
):
    customer = Customer(
        name=body.name.strip(),
        company_name=body.company_name.strip() or None,
        email=body.email.strip() or None,
        phone=body.phone.strip() or None,
        country=body.country.strip() or None,
        notes=body.notes.strip() or None,
        status="active",
    )
    db.add(customer)
    db.flush()
    log_action(db, current_user, "create_customer", get_client_ip(request), "customer", customer.id, customer.name)
    db.commit()
    db.refresh(customer)
    return customer


@router.put("/{customer_id}", response_model=CustomerOut)
async def update_customer(
    customer_id: int,
    body: CustomerUpdate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: AdminUser = Depends(get_current_user),
):
    customer = db.query(Customer).filter(Customer.id == customer_id).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")

    customer.name = body.name.strip()
    customer.company_name = body.company_name.strip() or None
    customer.email = body.email.strip() or None
    customer.phone = body.phone.strip() or None
    customer.country = body.country.strip() or None
    customer.notes = body.notes.strip() or None
    customer.status = body.status.strip()
    log_action(db, current_user, "update_customer", get_client_ip(request), "customer", customer_id, customer.name)
    db.commit()
    db.refresh(customer)
    return customer


@router.delete("/{customer_id}", response_model=MessageResponse)
async def delete_customer(
    customer_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: AdminUser = Depends(get_current_user),
):
    customer = db.query(Customer).filter(Customer.id == customer_id).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    log_action(db, current_user, "delete_customer", get_client_ip(request), "customer", customer_id, customer.name)
    db.delete(customer)
    db.commit()
    return {"message": "Customer deleted"}
