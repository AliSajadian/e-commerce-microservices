from enum import Enum

class InventoryStatus(Enum):
    """Inventory operation types"""
    ADJUSTMENT = "adjustment"
    RESERVATION = "reservation"
    FULFILLMENT = "fulfillment"
    RETURN = "return"
    DAMAGE = "damage"
    LOSS = "loss"