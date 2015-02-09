// AUTHOR: Josh Sherick, jsherick@umich.edu

/********************************/
/*           CONSTANTS          */
/********************************/
var ROOM_LIST_MAX_SIZE = 769; // Size that the #room-list collapses.



/********************************/
/*     SERVER COMMUNICATION     */
/********************************/
var Server = function() {

}

Server.prototype = {
    stdAjaxLoad: function(success_func, fail_func, s_levels, id, type) {
        // HELPER. INTENDED TO BE "PRIVATE".
        s_levels = typeof s_levels == "undefined" ? -1 : s_levels; // default: -1
        if (typeof id == "undefined") {
            // Load all.
            $.ajax({
                type: "GET",
                url: "/api/v1/" + type + "/",
                data: {"sub_levels": s_levels},
                success: success_func,
                fail: fail_func
            });
        } else {
            // Load specific.
            $.ajax({
                type: "GET",
                url: "/api/v1/" + type + "/" + id + "/",
                data: {"sub_levels": s_levels},
                success: success_func,
                fail: fail_func
            });
        }
    
    },
    loadBuildings: function(success_func, fail_func, s_levels, id) {
        this.stdAjaxLoad(success_func, fail_func, s_levels, id, "buildings");
    },
    loadRooms: function(success_func, fail_func, s_levels, id) {
        this.stdAjaxLoad(success_func, fail_func, s_levels, id, "rooms");
    },
    add: function(obj, success_func, fail_func) {
        if (obj instanceof Workstation) {
            $.ajax({
                type: "POST",
                url: "/api/v1/workstations/",
                data: {workstation:JSON.stringify(obj.toJSON())},
                success: success_func,
                fail: fail_func
            });
        } else if (obj instanceof Table) {
            $.ajax({
                type: "POST",
                url: "/api/v1/tables/",
                data: {table: JSON.stringify(obj.toJSON())},
                success: success_func,
                fail: fail_func
            });
        } else if (obj instanceof Room) {
            $.ajax({
                type: "POST",
                url: "/api/v1/rooms/",
                data: {room: JSON.stringify(obj.toJSON())},
                success: success_func,
                fail: fail_func
            });
        } else if (obj instanceof Building) {
            $.ajax({
                type: "POST",
                url: "/api/v1/buildings/",
                data: {building: JSON.stringify(obj.toJSON())},
                success: success_func,
                fail: fail_func
            });
        } else  {
            throw "Couldn't handle that type.";
        }
    }
}


/********************************/
/*       DATA MODEL CLASSES     */
/********************************/
var Point = function(data) {
    if (typeof data == "undefined") {
        this.x = -1;
        this.y = -1;
        this.id = -1;
        this.polygonId = -1;
        this.workstationId = -1;
        return;
    }
    this.x = data.x || -1;
    this.y = data.y || -1;
    this.id = data.id || -1;
    this.polygonId = data.polygonId || -1;
    this.workstationId = data.workstationId || -1;
};

Point.prototype = {
    toJSON: function() {
        // return a simplified JSON representation of this obj for serialization
        return {
                    id: this.id,
                    polygon_id: this.polygonId,
                    workstation_id: this.workstationId,
                    x: this.x,
                    y: this.y
               };
    }
};

var Polygon = function(data) {
    if (typeof data == "undefined") {
        this.points = [];
        this.id = -1;
        this.tableId = -1;
        this.roomId = -1;
        return;
    }
    this.points = data.points || [];
    this.id = data.id || -1;
    this.tableId = data.tableId || -1;
    this.roomId = data.roomId || -1;
    for (var i = 0; i < this.points.length; i++) { 
        // All polygons should be Polygon objects, not generic objects.
        if (!(this.points[i] instanceof Point)) {
            this.points[i] = new Point(this.points[i]);
        }
        // All points should have this as their polygonId.
        this.points[i].polygonId = this.id;
    }
};

Polygon.prototype = {
    addPoint: function(point) {
        point.polygonId = this.id;
        this.points.push(point);
    },
    removePoint: function(point) {
        for (var i = 0; i < this.points.length; i++) {
            if (this.points[i] == point) {
                this.points.splice(i, 1).polygonId = -1;
                return;
            }
        }
        return false;
    },
    toJSON: function() {
        // return a simplified JSON representation of this obj for serialization
        var json_points = [];
        for (var i = 0; i < this.points.length; i++) {
            json_points.push(this.points[i].toJSON());
        }
        return {
                    id: this.id,
                    table_id: this.tableId,
                    room_id: this.roomId,
                    points: json_points
               };
    }
};

var Workstation = function(data) {
    if (typeof data == "undefined") {
        this.coordinates = new Point();
        this.rotation = 0;
        this.ip = "";
        this.hostname = "";
        this.last_updated = "never";
        this.ws_status = "unavailable";
        this.id = -1;
        this.tableId = -1;
        return;
    }
    this.coordinates = data.coordinates ? new Point(data.coordinates) : new Point();
    this.rotation = data.rotation || 0;
    this.ip = data.ip || "";
    this.hostname = data.hostname || "";
    this.last_updated = data.last_updated || "never";
    this.ws_status = data.ws_status || "unavailable";
    this.id = data.id || -1;
    this.tableId = data.TableId || -1;
};

Workstation.prototype = {
    setCoordinates: function(point) {
        this.coordinates = point;
        point.workstationId = this.id;
    },
    toJSON: function() {
        // return a simplified JSON representation of this obj for serialization
        return {
                    id: this.id,
                    table_id: this.tableId,
                    coordinates: this.coordinates.toJSON(),
                    rotation: this.rotation,
                    ip: this.ip,
                    hostname: this.hostname,
                    last_updated: this.last_updated,
                    "status": this.wp_status // status is a reserved word
               };
    }
};


var Table = function(data) {
    if (typeof data == "undefined") {
        this.shape = new Polygon();
        this.workstations = [];
        this.avail_workstations = -1;
        this.id = -1;
        this.roomId = -1;
        return;
    }
    this.shape = data.shape ? new Polygon(data.shape) : new Polygon();
    this.workstations = data.workstations || [];
    this.avail_workstations = data.avail_workstations || -1;
    this.id = data.id || -1;
    this.roomId = data.roomId || -1;
    for (var i = 0; i < this.workstations.length; i++) { 
        // All workstations should be Workstation objects, not generic objects.
        if (!(this.tables[i] instanceof Workstation)) {
            this.workstations[i] = new Workstation(this.workstations[i]);
        }
        // All workstations should have this as their tableId.
        this.workstations[i].tableId = this.id;
    }
};

Table.prototype = {
    addWorkstation: function(ws) {
        ws.tableId = this.id;
        this.workstations.push(ws);
    },
    removeWorkstation: function(ws){
        for (var i = 0; i < this.workstations.length; i++) {
            if (this.workstations[i] == ws) {
                this.workstations.splice(i, 1).tableId = -1;
                return;
            }
        }
        return false;
    },
    toJSON: function() {
        // return a simplified JSON representation of this obj for serialization
        var json_workstations = [];
        for (var i = 0; i < this.workstations.length; i++) {
            json_workstations.push(this.workstations[i].toJSON());
        }
        return {
                    id: this.id,
                    room_id: this.roomId,
                    shape: this.shape.toJSON(),
                    workstations: json_workstations,
                    avail_workstations: this.avail_workstations,
               };
    }
};

var Room = function(data) {
    if (typeof data == "undefined") {
        this.name = "";
        this.shape = new Polygon();
        this.tables = [];
        this.bounding_box_width = 0;
        this.bounding_box_height = 0;
        this.avail_workstations = -1;
        this.id = -1;
        this.buildingId = -1;
        return;
    }
    this.name = data.name || "";
    this.shape = data.shape ? new Polygon(data.shape) : new Polygon();
    this.tables = data.tables || [];
    this.bounding_box_width = data.bounding_box_width || 0;
    this.bounding_box_height = data.bounding_box_height || 0;
    this.avail_workstations = data.avail_workstations || -1;
    this.id = data.id || -1;
    this.buildingId = data.buildingId || -1;
    for (var i = 0; i < this.tables.length; i++) { 
        // All tables should be Table objects, not generic objects.
        if (!(this.tables[i] instanceof Table)) {
            this.tables[i] = new Table(this.tables[i]);
        }
        // All tables should have this as their roomId.
        this.tables[i].roomId = this.id;
    }
};

Room.prototype = {
    addTable: function(table) {
        table.roomId = this.id;
        this.tables.push(table);
    },
    removeTable: function(table){
        for (var i = 0; i < this.tables.length; i++) {
            if (this.tables[i] == ws) {
                this.tables.splice(i, 1).roomId = -1;
                return;
            }
        }
        return false;
    },
    toJSON: function() {
        // return a simplified JSON representation of this obj for serialization
        var json_tables = [];
        for (var i = 0; i < this.tables.length; i++) {
            json_tables.push(this.tables[i].toJSON());
        }
        return {
                    id: this.id,
                    building_id: this.buildingId,
                    name: this.name,
                    shape: this.shape.toJSON(),
                    tables: json_tables,
                    bounding_box_width: this.bounding_box_width,
                    bounding_box_height: this.bounding_box_height,
                    avail_workstations: this.avail_workstations
               };
    }
};

var Building = function(data) {
    if (typeof data == "undefined") {
        this.shortcode = "";
        this.human_name = "";
        this.rooms = [];
        this.id = -1;
        return;
    }
    this.shortcode = data.shortcode || "";
    this.human_name = data.human_name || "";
    this.rooms = data.rooms || [];
    this.id = data.id || -1;
    for (var i = 0; i < this.rooms.length; i++) { 
        // All rooms should be Room objects, not generic objects.
        if (!(this.rooms[i] instanceof Room)) {
            this.rooms[i] = new Room(this.rooms[i]);
        }
        // All rooms should have this as their buildingId.
        this.rooms[i].buildingId = this.id;
    }
};

Building.prototype = {
    addRoom: function(room) {
        room.buildingId = this.id;
        this.rooms.push(room);
    },
    removeRoom: function(room){
        for (var i = 0; i < this.rooms.length; i++) {
            if (this.rooms[i] == room) {
                this.rooms.splice(i, 1).buildingId = -1;
                return;
            }
        }
        return false;
    },
    toJSON: function() {
        // return a simplified JSON representation of this obj for serialization
        var json_rooms = [];
        for (var i = 0; i < this.rooms.length; i++) {
            json_rooms.push(this.rooms[i].toJSON());
        }
        return {
                    id: this.id,
                    shortcode: this.shortcode,
                    human_name: this.human_name,
                    rooms: json_rooms
               };
    }
};






/********************************/
/*   DOCUMENT ELEMENT CLASSES   */
/********************************/
var CanvasMapper = function(_$canvas) {
    this.$canvas = _$canvas;
    this.context = this.$canvas[0].getContext('2d');
    this.currentRoom = {};
    
    this.bindHandlers();
    this.resizeCanvas();
};

CanvasMapper.prototype = {
    redraw: function() {
        h = this.context.canvas.height;
        w = this.context.canvas.width;
        // Set background color.
        this.context.fillStyle = 'rgb(255,255,255)';
        this.context.fillRect(0, 0, w, h);
    },
    loadRoom: function(_roomData) {
        
    },
    resizeCanvas: function() {
        // Set the html (and css) height to be correct.
        // Setting css height isn't enough.
        this.$canvas.height($(window).height());
        this.$canvas.width($(window).width() - $('#room-list').width());
        this.context.canvas.height = this.$canvas.height();
        this.context.canvas.width = this.$canvas.width();
        this.redraw();
    },
    bindHandlers: function() {
        // On window resize, resize this canvas.
        // jQuery is going to screw with this in our resize function.
        _this = this; 
        $( window ).resize(function() {
            _this.resizeCanvas();
        });
    }
};


var RoomScrollView = function() {
    this.$scrollView = $("<div />", {id:"room-scroller"});
    this.addBuildingDialog = this.addBuildingDialog.bind(this);
    this.addRoomDialog = this.addRoomDialog.bind(this);
    this.savedRoomsBuilding = null;
};

RoomScrollView.prototype = {
    loadAllBuildings: function(e) {
        // Loads all buildings into the RoomScrollView.
        // Create a new scroll view.
        this.$scrollView = $("<div />", {id:"room-scroller"});
        // Create "Add Building" button element
        var $addBuildingElem = 
                    $("<div />", {class:"scroller-item add-item unselectable"})
                    .append($("<div />", {class:"plus-icon"}), " Add Building")
                    .click(this.addBuildingDialog);
        this.$scrollView.append($addBuildingElem);

        var server = new Server();
        server.loadBuildings(function (data) { // Success.
            for (var i = 0; i < data.length; i++) {
                // Go through all buildings.
                var b = new Building(data[i]);
                var $bElem = $("<div />", {class:"scroller-item building-label"})
                                .append(b.human_name + " - " + b.shortcode)
                                .data("obj", b);
                this.$scrollView.append($bElem);

                var $addRoomElem = 
                            $("<div />", {class:"scroller-item add-item unselectable"})
                            .append($("<div />", {class:"plus-icon"}), " Add Room")
                            .click(this.addRoomDialog).data("obj", b);
                this.$scrollView.append($addRoomElem);

                for (var j = 0; j < b.rooms.length; j++) {
                    // Go through all rooms for this building.
                    var r = b.rooms[j];
                    var $rElem = $("<div />", {class:"scroller-item room-item"})
                                  .append($("<div />", {class:"room-item-name"})
                                            .append(r.name + " " + b.shortcode),
                                $("<div />", {class:"room-item-avail"}).append (
                (r.avail_workstations > 0 ? r.avail_workstations :  "0"), " ", 
                                    $("<span />", {class:"icon-avail"})
                                )
                            ).data("obj", r);
                    this.$scrollView.append($rElem);
                }
            }
            $("#room-scroller").replaceWith(this.$scrollView);
        }.bind(this), function (req, textStatus, error) { // Failure.
            // TODO: Handle failure gracefully.

        }.bind(this));
        

    },
    addRoomDialog: function(e) {
        // Handler for clicking on add building button, presents dialog.
        var saveBuilding = function() {
            var room = new Room({
                name: $("#rname").val()
            });
            this.savedRoomsBuilding.addRoom(room);
            var server = new Server();
            server.add(room, function () { // Success.
                // Reload all buildings.
                this.loadAllBuildings();
                DialogView.destroyAll();
            }.bind(this), function () { // Failure.
                // TODO: Handle failure gracefully.
            }.bind(this));
        }.bind(this);
        this.savedRoomsBuilding = $(e.currentTarget).data("obj");
        var $content = $("<div />").append(
                        $("<div />", {class:"content-group"}).append(
                         $("<label />", {for:"rname"}).text("Name:"),
                         $("<input />", {type:"text", id:"rname"})));
        var dialog = new DialogView({
            title: "Add Room",
            buttons: [
                        {
                            title: "Cancel",
                            destructive: false,
                            callback: undefined
                        },
                        {
                            title: "Save",
                            destructive: false,
                            callback: saveBuilding
                        }
                        ],
            content: $content,
        });
        dialog.show();
    },
    addBuildingDialog: function() {
        // Handler for clicking on add building button, presents dialog.
        var saveRoom = function() {
            var building = new Building({
                shortcode: $("#scode").val(),
                human_name: $("#hname").val()
            });
            var server = new Server();
            server.add(building, function () { // Success.
                // Reload all buildings.
                this.loadAllBuildings();
                DialogView.destroyAll();
            }.bind(this), function () { // Failure.
                // TODO: Handle failure gracefully.
            }.bind(this));
        }.bind(this);
        var $content = $("<div />").append(
                        $("<div />", {class:"content-group"}).append(
                         $("<label />", {for:"scode"}).text("Shortcode:"),
                         $("<input />", {type:"text", id:"scode"})),
                        $("<div />", {class:"content-group"}).append(
                         $("<label />", {for:"hname"}).text("Human Readable Name:"),
                         $("<input />", {type:"text", id:"hname"})));
        var dialog = new DialogView({
            title: "Add Building",
            buttons: [
                        {
                            title: "Cancel",
                            destructive: false,
                            callback: undefined
                        },
                        {
                            title: "Save",
                            destructive: false,
                            callback: saveRoom
                        }
                    ],
            content: $content,
        });
        dialog.show();
    },
};


var DialogView = function(options) {
    if (!options || !options.buttons || !options.content || !options.title) {
        throw 'DialogView requires buttons, content, title, and dialog to exist.';
    }
    if (DialogView.visible) {
        throw 'You can have only one DialogView open at a time.';
    }
    
    this.title = options.title;
    this.buttons = options.buttons;
    this.content = options.content;
    this.$dialogElem = null;
    this.destroy = this.destroy.bind(this);
};

DialogView.prototype = {
    show: function () {
        var $buttonBoxElem = $("<div />", {class:"button-box"});
        var returnFunc = function(){};
        for (var i = 0; i < this.buttons.length; i++) {
            var button = this.buttons[i];
            var $buttonElem = $("<div />", {class:"button unselectable"})
                    .text(button.title).unbind("click").click(
                        typeof button.callback == "undefined" ? 
                                            this.destroy : button.callback);
            if (button.destructive)
                $buttonElem.addClass("destructive");
            if (i == this.buttons.length - 1 &&
                    typeof button.callback != "undefined") {
                // Bind return key press to this function.
                returnFunc = button.callback;
            }
            $buttonBoxElem.append($buttonElem);
        }

        // Build dialog element.
        this.$dialogElem = $("<div />", {class:"dialog"})
                 .append($("<span />", {class:"title"}).text(this.title),
                         $("<div />", {class:"content-box"})
                             .append(this.content),
                         $buttonBoxElem).css({"display":"none"});
        

        // Add and show the dialog element.
        $("body").append(this.$dialogElem);
        this.$dialogElem.add(".black").show();
        DialogView.visible = true;

        // Set focus and keypress handlers.
        this.$dialogElem.find("input[type=text]").each(function(){
            $(this).keypress(function(event){
                if (event.keyCode == 13) // Pressed return/enter key.
                    returnFunc();
            });
        }).first().focus();

        // Dismiss when clicking on black.
        $(".black").unbind("click").click(this.destroy);
    },
    destroy: function() {
        this.$dialogElem.add(".black").hide();
        this.$dialogElem.remove();
        DialogView.visible = false;
    }
};

DialogView.destroyAll = function () {
    $(".dialog, .black").hide();
    $(".dialog").remove();
    DialogView.visible = false;
}

DialogView.visible = false; // Static variable



$(function(){
    var canvas = $('#canvas');
    var mapper = new CanvasMapper(canvas);

    var roomView = new RoomScrollView();
    roomView.loadAllBuildings();

    //$canvas.click(function(e){
        //var x = Math.floor((e.pageX-$canvas.offset().left) / 20);
        //var y = Math.floor((e.pageY-$canvas.offset().top) / 20);
        //context.fillStyle = "rgb(255,255,255)";
        //context.fillRect(x * 20, y * 20, 20, 20);
    //});
});




