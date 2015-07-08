/// <reference path="build/jquery" />
/// <reference path="build/three" />

/// <reference path="antigenic-map-viewer.d.ts" />

// ----------------------------------------------------------------------
// Interface for plot data structure generated by acmacs
// ----------------------------------------------------------------------

import AmvLevel1 = require("amv-level1");
import Amv2d = require("amv-2d");

export type PlotDataLayout = AntigenicMapViewer.PlotDataLayout;

// ----------------------------------------------------------------------

export class PlotData
{
    private _label_types :string[];
    private _drawing_order :number[]; // drawing order for an object by its index

    constructor(private plot_data :AntigenicMapViewer.PlotDataInterface) {
        if (this.number_of_dimensions() === 2) {
            this.make_drawing_order();
        }
    }

    public setup_map(widget :AmvLevel1.MapWidgetLevel1) :void {
        var number_of_dimensions = this.number_of_dimensions();
        widget.initialize_for_dimensions(number_of_dimensions);
        $.when(widget.initialization_completed).done(() => {
            this.add_objects(widget);
            if (number_of_dimensions === 2) {
                (<Amv2d.Objects>widget.objects).viewport(this.viewport());
                (<Amv2d.Viewer>widget.viewer).transform(this.transformation());
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
            if (number_of_dimensions === 2) {
                // flip layout
                obj.mesh = style.make([coordinates[0], -coordinates[1], 0], this.user_data(i));
                (<Amv2d.Object>obj).set_drawing_order(this.drawing_order_level(i));
            }
            else {
                obj.mesh = style.make(coordinates, this.user_data(i));
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

    public label_types() :string[] {
        if (!this._label_types) {
            this._label_types = [];
            try {
                var kk :string[] = [];
                for (var point_no = 0; point_no < this.plot_data.point_info.length; ++point_no) {
                    for (var k in this.plot_data.point_info[point_no]) {
                        kk.push(k);
                    }
                }
                kk.sort();
                for (var k_no = 0; k_no < kk.length; ++k_no) {
                    if (k_no === 0 || kk[k_no] !== kk[k_no - 1]) {
                        this._label_types.push(kk[k_no]);
                    }
                }
            } catch (err) {
                console.error('error looking for label_types:', err);
            }
        }
        return this._label_types;
    }

    public default_label_type() :string {
        var label_type = "label_capitalized";
        var all_label_types = this.label_types();
        if (all_label_types.length !== 0 && all_label_types.indexOf(label_type) === -1) {
            label_type = all_label_types[0];
        }
        return label_type;
    }

    public label_of(index :number, label_type :string) :string {
        var labels :any = this.plot_data.point_info[index];
        var label :string = labels[label_type];
        if (label === null || label === undefined) {
            // No label_type present for this point, return any existing label_type
            for (var lt in labels) {
                label = labels[lt];
                break;
            }
            if (label === null || label === undefined) {
                // no labels for this point at all
                label = "*no label for " + index + "*";
            }
        }
        return label;
    }

    public user_data(index :number) :ObjectUserData {
        var point_info :any = this.plot_data.point_info[index];
        var r :ObjectUserData = {
            index: index,
            name: point_info.label_full_name_only || point_info.label_full
        };
        if (point_info.passage) {
            r.passage = point_info.passage;
        }
        if (point_info.serum_id) {
            r.serum_id = point_info.serum_id;
        }
        if (point_info.extra) {
            r.extra = point_info.extra;
        }
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
}

// ----------------------------------------------------------------------

export interface ObjectUserData
{
    index :number;
    name :string;
    passage? :string;
    serum_id? :string;
    extra? :string;
}

// ----------------------------------------------------------------------

export class ObjectStyle
{
    private shape :string;
    private material :THREE.Material;
    private geometry :THREE.Geometry;
    private shown :Boolean;

    constructor(private plot_style :AntigenicMapViewer.PlotDataStyle, private factory :AmvLevel1.ObjectFactory) {
        [this.shape, this.geometry, this.material] = this.factory.make_geometry_material(plot_style);
        this.shown = this.plot_style.shown === undefined || this.plot_style.shown
    }

    public make(position :number[], user_data :ObjectUserData) :THREE.Mesh {
        var obj :THREE.Mesh = null;
        // console.log('make', this.shape, this.shown, JSON.stringify(this.plot_style));
        if (this.shown) {
            obj = this.factory.make_mesh(this.plot_style, this.shape, this.geometry, this.material);
            obj.position.fromArray(position);
            obj.scale.multiplyScalar(this.plot_style.size)
            obj.userData = user_data;
        }
        return obj
    }

}

// ----------------------------------------------------------------------
