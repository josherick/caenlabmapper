from flask import render_template, request, Response
from ..model import Point, Polygon, Workstation, Table, Room, Building
from . import apiv1
from .. import db
import json

# must pass object or list of objects that can have dict_repr() called on it
def encode_json(list_or_object, encode_as_string = True, human_readable = False, sub_levels = -1):
    if isinstance(list_or_object, list):
        for i, obj in enumerate(list_or_object):
            list_or_object[i] = encode_json(obj, encode_as_string = False, human_readable = human_readable, sub_levels = sub_levels)
        # return string or object depending on s
        return json.dumps(list_or_object, indent = (4 if human_readable else None)) if encode_as_string else list_or_object
    else:
        # return string or object depending on s
        return json.dumps(list_or_object.dict_repr(sub_levels = sub_levels), indent = (4 if human_readable else None)) if encode_as_string else list_or_object.dict_repr(sub_levels = sub_levels)

# returns a point object given a json representation of one
def parse_point(o):
    if not isinstance(o, str):
        # isn't parsed
        o = json.loads(o)
        
    point_obj = Point()
    point_obj.x = o.get('x')
    point_obj.y = o.get('y')
    return point_obj

# returns a polygon object given a json representation of one
def parse_polygon(o):
    if isinstance(o, str):
        # isn't parsed
        o = json.loads(o)

    poly_obj = Polygon()
    print o
    for point in o.get('points'):
        p = parse_point(point)
        p.polygon = poly_obj;

    return poly_obj


@apiv1.route('/')
def index():
    return '<html><head><title>API</title></head><body><h1>Lab Mapper API</h1><p>Docs forthcomings.</p></body></html>'

@apiv1.route('/buildings/', methods=['GET', 'POST'])
def buildings():
    if request.method == 'GET':
        # get all buildings
        buildings = Building.query.order_by(Building.shortcode).all()
        return Response(encode_json(buildings, human_readable = bool(request.args.get('human_readable')), sub_levels = (int(request.args.get('sub_levels')) if bool(request.args.get('sub_levels')) else -1)), mimetype='text/json')
    elif request.method == 'POST':
        building = json.loads(request.form.get('building'))
        if building.get('shortcode') and building.get('human_name'):
            shortcode_exists = Building.query.filter(Building.shortcode == building.get('shortcode')).first()
            if(shortcode_exists):
                return json.dumps({'error':'a building with that shortcode already exists'}), 400
            b = Building()
            b.shortcode = building.get('shortcode')
            b.human_name = building.get('human_name')
            db.session.add(b)
            db.session.commit()
            return encode_json(b)
        else:
            return json.dumps({'error':'you didn\'t include a shortcode or human_name'}), 400

@apiv1.route('/buildings/<int:id>/', methods=['GET', 'PUT', 'DELETE'])
def buildings_id(id):
    if request.method == 'GET':
        # get a specific building based on id
        building = Building.query.filter(Building.id == id).first()
        return Response(encode_json(building, human_readable = bool(request.args.get('human_readable')), sub_levels = (int(request.args.get('sub_levels')) if request.args.get('sub_levels') else -1)), mimetype='text/json')
    elif request.method == 'PUT':
        # update a building based on the id
        b = Building.query.filter(Building.id == id).first()
        if not b:
            return json.dumps({'error':'invalid id'}), 400
        if request.args.get('shortcode'):
            shortcode_exists = Building.query.filter(Building.shortcode == request.args.get('shortcode')).first()
            if(shortcode_exists):
                return json.dumps({'error':'a building with that shortcode already exists'}), 400
            b.shortcode = request.args.get('shortcode')
        if request.args.get('human_name'):
            b.human_name = request.args.get('human_name')
        db.session.commit()
        return encode_json(b)
    elif request.method == 'DELETE':
        # delete a building based on the id
        b = Building.query.filter(Building.id == id).first()
        if not b:
            return json.dumps({'error':'invalid id'}), 400
        db.session.delete(b)
        db.session.commit()
        return json.dumps({'success','deletion successful'})

@apiv1.route('/buildings/<string:shortcode>/', methods=['GET', 'PUT', 'DELETE'])
def buildings_shortcode(shortcode):
    if request.method == 'GET':
        # get a specific building based on shortcode
        building = Building.query.filter(Building.shortcode == shortcode).first()
        return Response(encode_json(building, human_readable = bool(request.args.get('human_readable')), sub_levels = (int(request.args.get('sub_levels')) if request.args.get('sub_levels') else -1)), mimetype='text/json')
    elif request.method == 'PUT':
        # update a building based on the shortcode
        b = Building.query.filter(Building.shortcode == shortcode).first()
        if not b:
            return json.dumps({'error':'invalid shortcode'}), 400
        if request.args.get('human_name'):
            b.human_name = request.args.get('human_name')
        db.session.commit()
        return encode_json(b)
    elif request.method == 'DELETE':
        # delete a building based on the shortcode
        b = Building.query.filter(Building.shortcode == shortcode).first()
        if not b:
            return json.dumps({'error':'invalid shortcode'}), 400
        db.session.delete(b)
        db.session.commit()
        return json.dumps({'success','deletion successful'})


@apiv1.route('/rooms/', methods=['GET', 'POST'])
def rooms():
    if request.method == 'GET':
        # get all rooms
        rooms = Room.query.order_by(Room.building.name).all()
        return Response(encode_json(rooms, human_readable = bool(request.args.get('human_readable')), sub_levels = (int(request.args.get('sub_levels')) if request.args.get('sub_levels') else -1)), mimetype='text/json')
    elif request.method == 'POST':
        room = json.loads(request.form.get('room'))
        if room.get('name') != None and \
           room.get('shape') != None and \
           room.get('bounding_box_width') != None  and \
           room.get('bounding_box_height') != None  and \
           room.get('building_id') != None:
            r = Room()
            r.name = room.get('name')
            r.shape = parse_polygon(room.get('shape'))
            r.bounding_box_width = room.get('bounding_box_width')
            r.bounding_box_height = room.get('bounding_box_height')
            b = Building.query.filter(Building.id == int(room.get('building_id'))).first()
            if not b:
                return json.dumps({'error':'the attached building_id doesn\'t exist'}), 400
            r.building = b

            db.session.add(r)
            db.session.commit()
            return encode_json(r)
        else:
            return json.dumps({'error':'you didn\'t include a name, shape, bounding_box_width, bounding_box_height, or building_id'}), 400


@apiv1.route('/rooms/<int:id>/', methods=['GET', 'PUT', 'DELETE'])
def rooms_id(id):
    if request.method == 'GET':
        # get a specific room based on id
        room = Room.query.filter(Room.id == id).first()
        return Response(encode_json(room, human_readable = bool(request.args.get('human_readable')), sub_levels = (int(request.args.get('sub_levels')) if request.args.get('sub_levels') else -1)), mimetype='text/json')
    elif request.method == 'PUT':
        # update a room based on the id
        r = Room.query.filter(Room.id == id).first()
        if not r:
            return json.dumps({'error':'invalid id'}), 400
        if request.args.get('name'):
            r.shortcode = request.args.get('name')
        if request.args.get('shape'):
            r.shape = parse_polygon(request.args.get('shape'))
        if request.args.get('bounding_box_width'):
            r.bounding_box_width = request.args.get('bounding_box_width')
        if request.args.get('bounding_box_height'):
            r.bounding_box_height = request.args.get('bounding_box_height')
        if request.args.get('building_id'):
            b = Building.query.filter(Building.id == int(request.args.get('building_id')))
            if not b:
                return json.dumps({'error':'the attached building_id doesn\'t exist'}), 400
            r.building = b
        db.session.commit()
        return encode_json(r)
    elif request.method == 'DELETE':
        # delete a room based on the id
        r = Room.query.filter(Room.id == id).first()
        if not r:
            return json.dumps({'error':'invalid id'}), 400
        db.session.delete(r)
        db.session.commit()
        return json.dumps({'success','deletion successful'})

@apiv1.route('/tables/', methods=['GET', 'POST'])
def tables():
    if request.method == 'GET':
        # get all tables
        tables = Table.query.order_by(Table.id).all()
        return Response(encode_json(workstations, human_readable = bool(request.args.get('human_readable')), sub_levels = (int(request.args.get('sub_levels')) if request.args.get('sub_levels') else -1)), mimetype='text/json')
    if request.method == 'POST':
        if request.form.get('shape') and request.form.get('room_id'):
            t = Table()
            t.shape = request.form.get('shape')
            r = Room.query.filter(Room.id == int(request.form.get('room_id'))).first()
            if not r:
                return json.dumps({'error':'the attached room_id doesn\'t exist'}), 400
            t.room = r

            db.session.add(t)
            db.session.commit()
            return encode_json(t)
        else:
            return json.dumps({'error':'you didn\'t include a shape or room_id'}), 400


@apiv1.route('/tables/<int:id>/', methods=['GET', 'PUT', 'DELETE'])
def tables_id(id):
    if request.method == 'GET':
        # get a specific tables based on id
        tables = Table.query.filter(Table.id == id).first()
        if not workstation:
            return json.dumps({'error':'a table with that id doesn\'t exist'}), 400
        return Response(encode_json(workstation, human_readable = bool(request.args.get('human_readable')), sub_levels = (int(request.args.get('sub_levels')) if request.args.get('sub_levels') else -1)), mimetype='text/json')
    elif request.method == 'PUT':
        # update a tables based on the id
        t = Table.query.filter(Table.id == id).first()
        if not t:
            return json.dumps({'error':'invalid id'}), 400
        if request.args.get('coordinates'):
            t.coordinates = parse_point(request.args.get('coordinates'))
        if request.args.get('room_id'):
            r = Room.query.filter(Room.id == int(request.args.get('room_id')))
            if not r:
                return json.dumps({'error':'the attached room_id doesn\'t exist'})
            t.room = r
        db.session.commit()
        return encode_json(t)
    elif request.method == 'DELETE':
        # delete a tables based on the id
        t = Table.query.filter(Table.id == id).first()
        if not t:
            return json.dumps({'error':'invalid id'}), 400
        db.session.delete(t)
        db.session.commit()
        return json.dumps({'success','deletion successful'})


@apiv1.route('/workstations/', methods=['GET', 'POST'])
def workstations():
    if request.method == 'GET':
        # get all workstations
        workstations = Workstation.query.order_by(Workstation.ip).all()
        return Response(encode_json(workstations, human_readable = bool(request.args.get('human_readable')), sub_levels = (int(request.args.get('sub_levels')) if request.args.get('sub_levels') else -1)), mimetype='text/json')
    if request.method == 'POST':
        if request.form.get('coordinates') and request.form.get('rotation') and \
           request.form.get('ip') and request.form.get('hostname') \
           and request.form.get('table_id'):
            r = Room()
            r.coordinates = parse_point(request.form.get('coordinates'))
            r.rotation = request.form.get('rotation')
            r.ip = request.form.get('ip')
            r.hostname = request.form.get('hostname')
            t = Table.query.filter(Table.id == int(request.form.get('table_id'))).first()
            if not t:
                return json.dumps({'error':'the attached table_id doesn\'t exist'}), 400
            r.table = t

            db.session.add(r)
            db.session.commit()
            return encode_json(r)
        else:
            return json.dumps({'error':'you didn\'t include coordinates, rotation, ip, hostname, or table_id'}), 400


@apiv1.route('/workstations/<int:id>/', methods=['GET', 'PUT', 'DELETE'])
def workstations_id(id):
    if request.method == 'GET':
        # get a specific workstation based on id
        workstation = Workstation.query.filter(Workstation.id == id).first()
        if not workstation:
            return json.dumps({'error':'a workstation with that id doesn\'t exist'}), 400
        return Response(encode_json(workstation, human_readable = bool(request.args.get('human_readable')), sub_levels = (int(request.args.get('sub_levels')) if request.args.get('sub_levels') else -1)), mimetype='text/json')
    elif request.method == 'PUT':
        # update a workstation based on the id
        w = Workstation.query.filter(Workstation.id == id).first()
        if not w:
            return json.dumps({'error':'invalid id'}), 400
        if request.args.get('coordinates'):
            w.coordinates = parse_point(request.args.get('coordinates'))
        if request.args.get('rotation'):
            w.rotation = request.args.get('rotation')
        if request.args.get('ip'):
            w.ip = request.args.get('ip')
        if request.args.get('hostname'):
            w.hostname = request.args.get('hostname')
        if request.args.get('table_id'):
            t = Table.query.filter(Table.id == int(request.args.get('table_id')))
            if not t:
                return json.dumps({'error':'the attached table_id doesn\'t exist'})
            w.table = t
        db.session.commit()
        return encode_json(w)
    elif request.method == 'DELETE':
        # delete a workstation based on the id
        w = Workstation.query.filter(Workstation.id == id).first()
        if not w:
            return json.dumps({'error':'invalid id'}), 400
        db.session.delete(w)
        db.session.commit()
        return json.dumps({'success','deletion successful'})


