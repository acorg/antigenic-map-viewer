/// <reference path="build/jquery" />
/// <reference path="build/three" />

/// <reference path="antigenic-map-viewer.d.ts" />

// ----------------------------------------------------------------------
// Interface for plot data structure generated by acmacs
// ----------------------------------------------------------------------

export type PlotDataLayout = AntigenicMapViewer.PlotDataLayout;
export type Transformation = AntigenicMapViewer.PlotDataTransformation;

// ----------------------------------------------------------------------

export interface Viewport
{
    cx :number;
    cy :number;
    size? :number;
}

// ----------------------------------------------------------------------

export class PlotData
{
    private _label_types :string[];

    constructor(private plot_data :AntigenicMapViewer.PlotDataInterface) {
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

    public layout() :AntigenicMapViewer.PlotDataLayout {
        return this.plot_data.layout;
    }

    public make_styles(factory :ObjectFactory) :ObjectStyle[] {
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

    public title() :string[] {
        try {
            return this.plot_data.title["0"].text;
        }
        catch (e) {
            return ['no title'];
        }
    }

    // 2d only
    public viewport() :Viewport {
        var viewport :Viewport = null;
        if (this.plot_data.viewport_size && this.plot_data.viewport_origin) {
            viewport = {cx: this.plot_data.viewport_origin[0] + this.plot_data.viewport_size[0] / 2,
                        cy: - this.plot_data.viewport_origin[1] - this.plot_data.viewport_size[1] / 2, // Y flipped between acmacs representation and webgl representation
                        size: this.plot_data.viewport_size[0]};
        }
        return viewport;
    }
}

// ----------------------------------------------------------------------

export interface ObjectUserData
{
    index :number;
}

// ----------------------------------------------------------------------

export interface MaterialClass
{
    new (parameters: THREE.MeshBasicMaterialParameters): THREE.Material;
}

// ----------------------------------------------------------------------

export class ObjectFactory
{
    protected material :MaterialClass;
    protected geometries :any;  // "shape-aspect-rotation[-outline_width]": THREE.Geometry, e.g  "circle-1.0-0.0", "box-1.0-0.0", "circle-outline-1.0-0.0-1.0", "box-outline-1.0-0.0-1.0"

    constructor() {
        this.geometries = {};
    }

    public make_geometry_material(plot_style :AntigenicMapViewer.PlotDataStyle) :[string, THREE.Geometry, THREE.Material] {
        var material = new this.material(this.convert_color(plot_style.fill_color));
        var shape :string = (plot_style.shape === undefined || plot_style.shape === null) ? "circle" : plot_style.shape;
        var geometry = this.make_geometry(shape, plot_style.outline_width);
        return [shape, geometry, material];
    }

    private make_geometry(shape :string, outline_width :number) :THREE.Geometry {
        var geometry = this.geometries[shape];
        if (!geometry) {
            switch (shape) {
            case "box":
            case "cube":
                this.make_box(outline_width);
                break;
            case "circle":
            case "sphere":
                this.make_circle(outline_width);
                break;
            case "triangle":
                this.make_triangle(outline_width);
                break;
            }
            geometry = this.geometries[shape];
        }
        return geometry;
    }

    public make_mesh(plot_style :AntigenicMapViewer.PlotDataStyle, shape :string, geometry :THREE.Geometry, material :THREE.Material) :THREE.Mesh {
        return this.make_mesh_2(plot_style.aspect, plot_style.rotation, geometry, material);
    }

    private make_mesh_2(aspect :number, rotation :number, geometry :THREE.Geometry, material :THREE.Material) :THREE.Mesh {
        var mesh = new THREE.Mesh(geometry, material);
        if (aspect !== 1 && aspect !== undefined && aspect !== null) {
            mesh.scale.set(aspect, 1, aspect);
        }
        if (rotation !== 0 && rotation !== undefined && rotation !== null) {
            mesh.rotation.set(0, 0, rotation);
        }
        return mesh;
    }

    // adds to this.geometries
    protected make_circle(outline_width :number = 1.0) :void {
        throw "Override in derived of acmacs-plot-data::ObjectFactory";
    }

    // adds to this.geometries
    protected make_box(outline_width :number = 1.0) :void {
        throw "Override in derived of acmacs-plot-data::ObjectFactory";
    }

    protected make_triangle(outline_width :number = 1.0) :void {
        throw "Override in derived of acmacs-plot-data::ObjectFactory";
    }

    protected convert_color(source :any) :THREE.MeshBasicMaterialParameters {
        var material_color :THREE.MeshBasicMaterialParameters;
        if ($.type(source) === "string") {
            if (source === "transparent") {
                material_color = {transparent: true, opacity: 0};
            }
            else {
                material_color = {transparent: false, color: (new THREE.Color(source)).getHex(), opacity: 1};
            }
        }
        else if ($.type(source) === "array") {
            material_color = {transparent: true, opacity: source[1], color: (new THREE.Color(source[0])).getHex()};
        }
        // console.log('convert_color', JSON.stringify(material_color));
        return material_color;
    }

    public make_mesh_restoring_state(plot_style :AntigenicMapViewer.Object3d) :THREE.Mesh {
        var color :any = plot_style.fill_opacity !== null && plot_style.fill_opacity !== undefined ? [plot_style.fill_color, plot_style.fill_opacity] : plot_style.fill_color;
        return this.make_mesh_2(plot_style.aspect, plot_style.rotation,
                                this.make_geometry(plot_style.shape, plot_style.outline_width),
                                new this.material(this.convert_color(color)));
    }
}

// ----------------------------------------------------------------------

export class ObjectStyle
{
    private shape :string;
    private material :THREE.Material;
    private geometry :THREE.Geometry;
    private shown :Boolean;

    constructor(private plot_style :AntigenicMapViewer.PlotDataStyle, private factory :ObjectFactory) {
        [this.shape, this.geometry, this.material] = this.factory.make_geometry_material(plot_style);
        this.shown = this.plot_style.shown === undefined || this.plot_style.shown
    }

    public make(position :number[], user_data :ObjectUserData) :THREE.Mesh {
        var obj :THREE.Mesh = null;
        // console.log('make', this.shape, this.shown, JSON.stringify(this.plot_style));
        if (this.shown) {
            obj = this.factory.make_mesh(this.plot_style, this.shape, this.geometry, this.material);
            obj.position.set.apply(obj.position, position);
            obj.scale.multiplyScalar(this.plot_style.size)
            obj.userData = user_data;
        }
        return obj
    }

}

// ----------------------------------------------------------------------
