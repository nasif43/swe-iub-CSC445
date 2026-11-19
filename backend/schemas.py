from pydantic import BaseModel, ConfigDict
from typing import List, Optional
from datetime import datetime


class UserBase(BaseModel):
    name: str
    email: str
    phone: str
    role: str
    rating: float = 5.0


class UserCreate(UserBase):
    password: str


class User(UserBase):
    id: int
    model_config = ConfigDict(from_attributes=True)


class ListingBase(BaseModel):
    vehicle_name: str
    model: str
    make: str
    reg_number: str
    hourly_rate: float
    wear_tear_rate: float
    is_available: bool = True
    auto_accept: bool = False
    schedule_days: str
    schedule_start: str
    schedule_end: str
    max_radius_km: float
    photo_url: str = ""


class ListingCreate(ListingBase):
    pass


class Listing(ListingBase):
    id: int
    owner_id: int
    model_config = ConfigDict(from_attributes=True)


class BookingBase(BaseModel):
    listing_id: int
    renter_id: int
    estimated_fare: float
    pickup_location: str


class BookingCreate(BookingBase):
    pass


class Booking(BookingBase):
    id: int
    status: str
    start_time: datetime
    end_time: Optional[datetime] = None
    total_fare: Optional[float] = None
    model_config = ConfigDict(from_attributes=True)


class PassengerTripBase(BaseModel):
    passenger_id: int
    renter_id: int
    booking_id: int
    pickup_loc: str
    dropoff_loc: str
    fare: float


class PassengerTripCreate(PassengerTripBase):
    pass


class PassengerTrip(PassengerTripBase):
    id: int
    status: str
    model_config = ConfigDict(from_attributes=True)

