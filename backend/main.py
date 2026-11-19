from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List

import models
import schemas
import crud
from database import SessionLocal, engine

models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="OurBike API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@app.post("/users/", response_model=schemas.User)
def create_user(user: schemas.UserCreate, db: Session = Depends(get_db)):
    db_user = db.query(models.User).filter(models.User.email == user.email).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    return crud.create_user(db=db, user=user)


@app.get("/users/", response_model=List[schemas.User])
def read_users(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    users = crud.get_users(db, skip=skip, limit=limit)
    return users


@app.get("/users/{user_id}", response_model=schemas.User)
def read_user(user_id: int, db: Session = Depends(get_db)):
    db_user = crud.get_user(db, user_id=user_id)
    if db_user is None:
        raise HTTPException(status_code=404, detail="User not found")
    return db_user


@app.post("/users/{user_id}/listings/", response_model=schemas.Listing)
def create_listing_for_user(
    user_id: int, listing: schemas.ListingCreate, db: Session = Depends(get_db)
):
    return crud.create_listing(db=db, listing=listing, owner_id=user_id)


@app.get("/listings/", response_model=List[schemas.Listing])
def read_listings(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    listings = crud.get_listings(db, skip=skip, limit=limit)
    return listings


@app.post("/bookings/", response_model=schemas.Booking)
def create_booking(booking: schemas.BookingCreate, db: Session = Depends(get_db)):
    return crud.create_booking(db=db, booking=booking)


@app.get("/users/{user_id}/bookings/", response_model=List[schemas.Booking])
def read_bookings(user_id: int, db: Session = Depends(get_db)):
    return crud.get_bookings(db=db, user_id=user_id)


@app.put("/bookings/{booking_id}/status", response_model=schemas.Booking)
def update_booking(
    booking_id: int, status: str, db: Session = Depends(get_db)
):
    db_booking = crud.update_booking_status(db=db, booking_id=booking_id, status=status)
    if not db_booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    return db_booking


@app.post("/passenger-trips/", response_model=schemas.PassengerTrip)
def create_passenger_trip(
    trip: schemas.PassengerTripCreate, db: Session = Depends(get_db)
):
    return crud.create_passenger_trip(db=db, trip=trip)


@app.get(
    "/users/{user_id}/passenger-trips/", response_model=List[schemas.PassengerTrip]
)
def read_passenger_trips(user_id: int, db: Session = Depends(get_db)):
    return crud.get_passenger_trips(db=db, user_id=user_id)


@app.post("/seed")
def seed_database(db: Session = Depends(get_db)):
    owner = crud.create_user(
        db,
        schemas.UserCreate(
            name="Alice Owner",
            email="alice@test.com",
            phone="123",
            role="owner",
            password="password",
        ),
    )
    renter = crud.create_user(
        db,
        schemas.UserCreate(
            name="Bob Renter",
            email="bob@test.com",
            phone="456",
            role="renter",
            password="password",
        ),
    )
    passenger = crud.create_user(
        db,
        schemas.UserCreate(
            name="Charlie Passenger",
            email="charlie@test.com",
            phone="789",
            role="passenger",
            password="password",
        ),
    )
    crud.create_listing(
        db,
        schemas.ListingCreate(
            vehicle_name="Yamaha FZS",
            model="FZS v3",
            make="Yamaha",
            reg_number="DHAKA-L-123",
            hourly_rate=150.0,
            wear_tear_rate=20.0,
            schedule_days="Mon,Tue",
            schedule_start="10:00",
            schedule_end="18:00",
            max_radius_km=10.0,
        ),
        owner_id=owner.id,
    )
    return {"message": "Database seeded"}

