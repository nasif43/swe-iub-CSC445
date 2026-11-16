from sqlalchemy import Boolean, Column, DateTime, Float, ForeignKey, Integer, String
from sqlalchemy.orm import relationship
from database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True)
    name = Column(String)
    email = Column(String)
    password_hash = Column(String)
    phone = Column(String)
    role = Column(String)
    rating = Column(Float)


class Listing(Base):
    __tablename__ = "listings"

    id = Column(Integer, primary_key=True)
    owner_id = Column(Integer, ForeignKey("users.id"))
    vehicle_name = Column(String)
    model = Column(String)
    make = Column(String)
    reg_number = Column(String)
    hourly_rate = Column(Float)
    wear_tear_rate = Column(Float)
    is_available = Column(Boolean)
    auto_accept = Column(Boolean)
    schedule_days = Column(String)
    schedule_start = Column(String)
    schedule_end = Column(String)
    max_radius_km = Column(Float)
    photo_url = Column(String)

    owner = relationship("User")


class Booking(Base):
    __tablename__ = "bookings"

    id = Column(Integer, primary_key=True)
    listing_id = Column(Integer, ForeignKey("listings.id"))
    renter_id = Column(Integer, ForeignKey("users.id"))
    status = Column(String)
    estimated_fare = Column(Float)
    start_time = Column(DateTime)
    end_time = Column(DateTime)
    total_fare = Column(Float)
    pickup_location = Column(String)

    listing = relationship("Listing")
    renter = relationship("User")


class PassengerTrip(Base):
    __tablename__ = "passenger_trips"

    id = Column(Integer, primary_key=True)
    passenger_id = Column(Integer, ForeignKey("users.id"))
    renter_id = Column(Integer, ForeignKey("users.id"))
    booking_id = Column(Integer, ForeignKey("bookings.id"))
    pickup_loc = Column(String)
    dropoff_loc = Column(String)
    fare = Column(Float)
    status = Column(String)
