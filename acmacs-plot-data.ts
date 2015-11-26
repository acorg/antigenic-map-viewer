"use strict";

// ----------------------------------------------------------------------
// Interface for plot data structure generated by acmacs
// ----------------------------------------------------------------------

import TypingsReferences = require("build/typings-references");
import AmvLevel1 = require("amv-level1");
import Amv2d = require("amv-2d");

export type PlotDataLayout = AntigenicMapViewer.PlotDataLayout;

// ----------------------------------------------------------------------

export class PlotData
{
    private _drawing_order :number[]; // drawing order for an object by its index

    constructor(private plot_data :AntigenicMapViewer.PlotDataInterface) {
        if (this.number_of_dimensions() === 2) {
            this.make_drawing_order();
        }
    }

    public setup_map(widget :AmvLevel1.MapWidgetLevel1) :void {
        var number_of_dimensions = this.number_of_dimensions();
        $.when(widget.initialize_for_dimensions(number_of_dimensions)).done(() => {
            this.add_objects(widget);
            if (number_of_dimensions === 2) {
                (<Amv2d.Objects>widget.objects).viewport(this.viewport());
                (<Amv2d.Viewer>widget.viewer).initial_transformation(this.transformation());
                widget.viewer.reset();
            }
            widget.viewer.objects_updated();
            widget.viewer.camera_update();
        });
    }

    private add_objects(widget :AmvLevel1.MapWidgetLevel1) :void {
        var number_of_objects = this.number_of_objects();
        var number_of_dimensions = this.number_of_dimensions();
        var factory = widget.object_factory(number_of_objects);
        var styles = this.make_styles(factory);
        for (var i = 0; i < number_of_objects; ++i) {
            var obj = factory.make_object();
            var style = styles[this.style_no(i)];
            var coordinates = this.layout(i);
            obj.set_body(style.make_body(), style.make_outline());
            obj.userData = this.user_data(i);
            if (number_of_dimensions === 2) {
                // flip layout
                obj.position.set(coordinates[0], -coordinates[1], 0);
                obj.body.rotation.z = style.rotation() || 0;
                (<Amv2d.Object>obj).set_drawing_order(this.drawing_order_level(i));
            }
            else {
                obj.position.fromArray(coordinates);
            }
            widget.objects.objects.push(obj);
            widget.add(obj);
        }
    }

    public number_of_dimensions() :number {
        return this.plot_data.layout[0].length;
    }

    public number_of_objects() :number {
        return this.plot_data.layout.length;
    }

    public styles() :AntigenicMapViewer.PlotDataStyle[] {
        return this.plot_data.styles.styles;
    }

    public style_no(index :number) :number {
        return this.plot_data.styles.points[index];
    }

    public drawing_order_level(index :number) :number {
        return (this._drawing_order && (this._drawing_order[index] || 0)) || 0;
    }

    public layout(index :number) :number[] {
        return this.plot_data.layout[index];
    }

    public make_styles(factory :AmvLevel1.ObjectFactory) :ObjectStyle[] {
        return this.styles().map((style :AntigenicMapViewer.PlotDataStyle) => new ObjectStyle(style, factory));
    }

    public transformation() :AntigenicMapViewer.PlotDataTransformation {
        return this.plot_data.transformation;
    }

    public user_data(index :number) :AmvLevel1.ObjectUserData {
        var point_info :any = this.plot_data.point_info[index];
        var r :AmvLevel1.ObjectUserData = {
            index: index,
            names: this.make_names(point_info),
            state: {name_shown :false}
        };
        return r;
    }

    public title() :string[] {
        try {
            return this.plot_data.title["0"].text;
        }
        catch (e) {
            return ['no title'];
        }
    }

    // 2d only
    public viewport() :Amv2d.Viewport {
        var viewport :Amv2d.Viewport = null;
        if (this.plot_data.viewport_size && this.plot_data.viewport_origin) {
            viewport = {cx: this.plot_data.viewport_origin[0] + this.plot_data.viewport_size[0] / 2,
                        cy: - this.plot_data.viewport_origin[1] - this.plot_data.viewport_size[1] / 2, // Y flipped between acmacs representation and webgl representation
                        size: this.plot_data.viewport_size[0]};
        }
        return viewport;
    }

    // 2d only
    private make_drawing_order() :void {
        if (this.plot_data.styles.drawing_order && this.plot_data.styles.drawing_order.length > 1) {
            this._drawing_order = [];
            this.plot_data.styles.drawing_order.forEach(function(value :number[], level :number) {
                value.forEach(function(index :number) {
                    this._drawing_order[index] = level;
                }, this);
            }, this);
        }
    }

    private make_names(point_info :any) :any {
        var r :any = {};
        if (point_info.name !== null && point_info.name !== undefined) {
            // var n = point_info.name;
            // if (n.isolation_number) {
            //     r.full = [n.virus_type || '', n.host || '', n.location || '', n.isolation_number || '', n.year || ''].join('/')
            //     r.short = [(n.virus_type && n.virus_type[0]) || '', (n.host && n.host !== "HUMAN") ? n.host : '', n.location || '', n.isolation_number || '', n.year || ''].filter(function(e) {return e !== '';}).join('/')
            //     r.abbreviated = [(n.virus_type && n.virus_type[0]) || '', (n.host && n.host !== "HUMAN") ? n.host.substr(0, 2) : '', this.make_location_abbreviation(point_info), n.isolation_number || '', (n.year && n.year.substr(2)) || ''].filter(function(e) {return e !== '';}).join('/')
            // }
            // else if (n.name) {
                // if (n.cdc_abbreviation) {
                //     r.full = n.cdc_abbreviation + ' ' + n.name;
                // }
                // else {
                //     r.full = n.name
                // }
            r.full = point_info.name
            r.short = r.full;
            r.abbreviated = r.full;
            // }
            if (point_info.serum_id) {
                r.full += ' ' + point_info.serum_id;
                r.serum_id = point_info.serum_id;
            }
            if (point_info.passage) {
                r.full += ' ' + point_info.passage;
                r.passage = point_info.passage;
            }
            if (point_info.extra) {
                r.full += ' ' + point_info.extra;
                r.short += ' ' + point_info.extra;
                r.abbreviated += ' ' + point_info.extra;
            }
        }
        // else if (point_info.label !== null && point_info.label !== undefined) {
        //     r.full = point_info.label;
        //     r.short = r.full;
        //     r.abbreviated = r.full;
        // }
        if (point_info.date) {
            r.date = point_info.date;
        }
        if (point_info.location) {
            var l = point_info.location;
            if (l.continent) {
                r.continent = l.continent;
            }
            if (l.country) {
                r.country = l.country;
            }
        }
        return r;
    }

    private make_location_abbreviation(point_info :any) :string {
        var r :string;
        if (point_info.location && point_info.location.country === "UNITED STATES OF AMERICA" && point_info.location.cdc_abbreviation) {
            r = point_info.location.cdc_abbreviation;
        }
        else if (point_info.name && point_info.name.location) {
            r = point_info.name.location[0].toUpperCase() + point_info.name.location[1].toLowerCase();
        }
        else {
            r = "??";
        }
        return r;
    }
}

// ----------------------------------------------------------------------

export class ObjectStyle
{
    private shown :boolean;

    constructor(private plot_style :AntigenicMapViewer.PlotDataStyle, private factory :AmvLevel1.ObjectFactory) {
        this.shown = this.plot_style.shown === undefined || this.plot_style.shown
    }

    public make_body() :THREE.Mesh {
        var mesh :THREE.Mesh = null;
        // console.log('make', this.shape, this.shown, JSON.stringify(this.plot_style));
        // if (this.shown) {
        mesh = this.factory.make_mesh(this.plot_style.aspect, this.plot_style.shape || "circle", this.plot_style.fill_color);
        mesh.scale.multiplyScalar(this.plot_style.size)
        // }
        return mesh
    }

    public make_outline() :THREE.Object3D {
        return this.factory.make_outline(this.plot_style.shape || "circle", this.plot_style.outline_width, this.plot_style.outline_color);
    }

    public rotation() :number {
        return this.plot_style.rotation;
    }
}

// ----------------------------------------------------------------------
