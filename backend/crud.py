from sqlalchemy.orm import Session
from sqlalchemy import or_
import models
import schemas
from datetime import datetime


def get_user(db: Session, user_id: int):
    return db.query(models.User).filter(models.User.id == user_id).first()


def get_users(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.User).offset(skip).limit(limit).all()


def create_user(db: Session, user: schemas.UserCreate):
    fake_hashed_password = user.password + "_fakehash"
    db_user = models.User(
        name=user.name,
        email=user.email,
        phone=user.phone,
        role=user.role,
        rating=user.rating,
        password_hash=fake_hashed_password,
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user


def get_listings(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.Listing).offset(skip).limit(limit).all()


def create_listing(db: Session, listing: schemas.ListingCreate, owner_id: int):
    db_listing = models.Listing(**listing.model_dump(), owner_id=owner_id)
    db.add(db_listing)
    db.commit()
    db.refresh(db_listing)
    return db_listing


def get_bookings(db: Session, user_id: int):
    return (
        db.query(models.Booking)
        .filter(
            or_(
                models.Booking.renter_id == user_id,
                models.Booking.listing.has(owner_id=user_id),
            )
        )
        .all()
    )


def create_booking(db: Session, booking: schemas.BookingCreate):
    db_booking = models.Booking(**booking.model_dump())
    db.add(db_booking)
    db.commit()
    db.refresh(db_booking)
    return db_booking


def update_booking_status(db: Session, booking_id: int, status: str):
    db_booking = (
        db.query(models.Booking).filter(models.Booking.id == booking_id).first()
    )
    if not db_booking:
        return None
    db_booking.status = status
    if status == "completed":
        db_booking.end_time = datetime.utcnow()
        duration_hours = max(
            1.0,
            (db_booking.end_time - db_booking.start_time).total_seconds() / 3600.0,
        )
        listing = db_booking.listing
        if listing:
            db_booking.total_fare = (
                listing.hourly_rate + listing.wear_tear_rate
            ) * duration_hours
    db.commit()
    db.refresh(db_booking)
    return db_booking


def get_passenger_trips(db: Session, user_id: int):
    return (
        db.query(models.PassengerTrip)
        .filter(
            or_(
                models.PassengerTrip.passenger_id == user_id,
                models.PassengerTrip.renter_id == user_id,
            )
        )
        .all()
    )


def create_passenger_trip(db: Session, trip: schemas.PassengerTripCreate):
    db_trip = models.PassengerTrip(**trip.model_dump())
    db.add(db_trip)
    db.commit()
    db.refresh(db_trip)
    return db_trip

