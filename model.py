import datetime
from labmap import db
import json


class Point(db.Model):
    __tablename__ = 'Points'
    id = db.Column(db.Integer, primary_key=True)
    x = db.Column(db.Numeric())
    y = db.Column(db.Numeric())
    polygon_id = db.Column(db.Integer, db.ForeignKey('Polygons.id'))
    workstation_id = db.Column(db.Integer, db.ForeignKey('Workstations.id'))
    
    def dict_repr(self, sub_levels = -1):
        return {'id': self.id, \
                'x': float(self.x), \
                'y': float(self.y)}

    def json_repr(self, sub_levels = -1):
        return json.dumps(self.dict_repr(sub_levels))

class Polygon(db.Model):
    __tablename__ = 'Polygons'
    id = db.Column(db.Integer, primary_key=True)
    # Polygons are always relative to the bounding box.
    points = db.relationship('Point', backref='polygon')
    table_id = db.Column(db.Integer, db.ForeignKey('Tables.id'))
    room_id = db.Column(db.Integer, db.ForeignKey('Rooms.id'))

    def dict_repr(self, sub_levels = -1):
        dict_points = []
        if sub_levels != 0:
            for point in self.points:
                dict_points.append(point.dict_repr(sub_levels - 1))
        return {'id': self.id, \
                'points': dict_points}

    def json_repr(self, sub_levels = -1):
        return json.dumps(self.dict_repr(sub_levels))


class Workstation(db.Model):
    __tablename__ = 'Workstations'
    id = db.Column(db.Integer, primary_key=True)
    created_at = db.Column(db.DateTime, default=datetime.datetime.now())
    coordinates = db.relationship('Point', backref='workstation', uselist=False)
    rotation = db.Column(db.Numeric())
    ip = db.Column(db.String(64))
    hostname = db.Column(db.String(128))
    last_updated = db.Column(db.DateTime, default=datetime.datetime.now())
    status = db.Column(db.String(64))
    table_id = db.Column(db.Integer, db.ForeignKey('Tables.id'))

    def dict_repr(self, sub_levels = -1):
        return {'id': self.id, \
                'coordinates': self.coordinates.dict_repr() if self.coordinates else None, \
                'rotation': float(self.rotation), \
                'ip': self.ip, \
                'hostname': self.hostname, \
                'last_updated': self.last_updated.strftime('%m/%d/%y %I:%M%p'), \
                'status': self.status}

    def json_repr(self, sub_levels = -1):
        return json.dumps(self.dict_repr())


class Table(db.Model):
    __tablename__ = 'Tables'
    id = db.Column(db.Integer, primary_key=True)
    created_at = db.Column(db.DateTime, default=datetime.datetime.now())
    shape = db.relationship('Polygon', backref='table', uselist=False)
    workstations = db.relationship('Workstation', backref='table')
    avail_workstations = db.Column(db.Integer())
    room_id = db.Column(db.Integer, db.ForeignKey('Rooms.id'))

    def dict_repr(self, sub_levels = -1):
        dict_workstations = []
        if sub_levels != 0:
            for workstation in self.workstations:
                dict_workstations.append(workstation.dict_repr(sub_levels - 1))
        return {'id': self.id, \
                'shape': self.shape.dict_repr() if self.shape else None, \
                'workstations': dict_workstations, \
                'avail_workstations': self.avail_workstations}

    def json_repr(self, sub_levels = -1):
        return json.dumps(self.dict_repr(sub_levels))

class Room(db.Model):
    __tablename__ = 'Rooms'
    id = db.Column(db.Integer, primary_key=True)
    created_at = db.Column(db.DateTime, default=datetime.datetime.now())
    name = db.Column(db.String(128), nullable=False)
    shape = db.relationship('Polygon', backref='room', uselist=False)
    tables = db.relationship('Table', backref='room')
    bounding_box_width = db.Column(db.Numeric())
    bounding_box_height = db.Column(db.Numeric())
    avail_workstations = db.Column(db.Integer())
    building_id = db.Column(db.Integer, db.ForeignKey('Buildings.id'))

    def dict_repr(self, sub_levels = -1):
        dict_tables = []
        if sub_levels != 0:
            for table in self.tables:
                dict_tables.append(table.dict_repr(sub_levels - 1))

        return {'id': self.id, \
                'name': self.name, \
                'shape': self.shape.dict_repr() if self.shape else None, \
                'tables': dict_tables, \
                'bounding_box_width': float(self.bounding_box_width), \
                'bounding_box_height': float(self.bounding_box_height), \
                'avail_workstations': self.avail_workstations}

    def json_repr(self, sub_levels = -1):
        return json.dumps(self.dict_repr(sub_levels))

class Building(db.Model):
    __tablename__ = 'Buildings'
    id = db.Column(db.Integer, primary_key=True)
    created_at = db.Column(db.DateTime, default=datetime.datetime.now())
    shortcode = db.Column(db.String(64), nullable=False)
    human_name = db.Column(db.String(128), nullable=False)
    rooms = db.relationship('Room', backref='building')

    def dict_repr(self, sub_levels = -1):
        dict_rooms = []
        if sub_levels != 0:
            for room in self.rooms:
                dict_rooms.append(room.dict_repr(sub_levels - 1))
        return {'id': self.id, \
                'shortcode': self.shortcode, \
                'human_name': self.human_name, \
                'rooms': dict_rooms}

    def json_repr(self, sub_levels = -1):
        return json.dumps(self.dict_repr(sub_levels))
    

