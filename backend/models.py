from sqlalchemy import Boolean, Column, ForeignKey, Integer, String, Float, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime
from database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    email = Column(String, unique=True, index=True)
    password_hash = Column(String)
    phone = Column(String)
    role = Column(String, default="owner")
    rating = Column(Float, default=5.0)

    listings = relationship("Listing", back_populates="owner")
    bookings = relationship("Booking", back_populates="renter")


class Listing(Base):
    __tablename__ = "listings"

    id = Column(Integer, primary_key=True, index=True)
    owner_id = Column(Integer, ForeignKey("users.id"))
    vehicle_name = Column(String, index=True)
    model = Column(String)
    make = Column(String)
    reg_number = Column(String)
    hourly_rate = Column(Float)
    wear_tear_rate = Column(Float)
    is_available = Column(Boolean, default=True)
    auto_accept = Column(Boolean, default=False)
    schedule_days = Column(String)
    schedule_start = Column(String)
    schedule_end = Column(String)
    max_radius_km = Column(Float)
    photo_url = Column(String)

    owner = relationship("User", back_populates="listings")
    bookings = relationship("Booking", back_populates="listing")


class Booking(Base):
    __tablename__ = "bookings"

    id = Column(Integer, primary_key=True, index=True)
    listing_id = Column(Integer, ForeignKey("listings.id"))
    renter_id = Column(Integer, ForeignKey("users.id"))
    status = Column(String, default="pending")
    estimated_fare = Column(Float)
    start_time = Column(DateTime, default=datetime.utcnow)
    end_time = Column(DateTime, nullable=True)
    total_fare = Column(Float, nullable=True)
    pickup_location = Column(String)

    listing = relationship("Listing", back_populates="bookings")
    renter = relationship("User", back_populates="bookings")
    passenger_trips = relationship("PassengerTrip", back_populates="booking")


class PassengerTrip(Base):
    __tablename__ = "passenger_trips"

    id = Column(Integer, primary_key=True, index=True)
    passenger_id = Column(Integer, ForeignKey("users.id"))
    renter_id = Column(Integer, ForeignKey("users.id"))
    booking_id = Column(Integer, ForeignKey("bookings.id"))
    pickup_loc = Column(String)
    dropoff_loc = Column(String)
    fare = Column(Float)
    status = Column(String, default="pending")

    booking = relationship("Booking", back_populates="passenger_trips")
    passenger = relationship("User", foreign_keys=[passenger_id])
    renter = relationship("User", foreign_keys=[renter_id])

