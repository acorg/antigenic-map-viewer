// Type definitions for the antigenic map viewer interface

declare module AntigenicMapViewer {

// ----------------------------------------------------------------------

    interface Amv
    {
        start() :JQueryPromise<any>;
        require_deferred(modules :string[]) :JQueryPromise<any>;
    }

// ----------------------------------------------------------------------

    type Position = number[];

    type Color = string | number | any[];

    type MapElementId = number;

// ----------------------------------------------------------------------

    interface TriggeringEvent
    {
        trigger(event :string, data :any) :void;
        on(event :string, callback: (data :any) => void) :JQuery;
    }

// ----------------------------------------------------------------------

    type Transformation = [[number, number], [number, number]];

// ----------------------------------------------------------------------

//     interface PlotDataInterface
//     {
//         version :number;
//         diameter? :number[];
//         layout :PlotDataLayout;
//         number_of_antigens? :number;
//         point_info :Object[];
//         styles :PlotDataStyles;
//         title? :PlotDataTitle;
//         viewport_size? :[number, number];
//         viewport_origin? :[number, number];
//         transformation? :PlotDataTransformation; //  [[1.0, 0.0], [0.0, 1.0]]
//     }

//     type PlotDataLayout = number[][];

//     interface PlotDataStyles
//     {
//         drawing_order? :number[][];
//         points :number[];
//         styles :PlotDataStyle[];
//     }

//     interface PlotDataStyle
//     {
//         aspect? :number;
//         fill_color :string|any[];
//         outline_color :string|any[];
//         outline_width? :number;
//         rotation? :number;
//         shape :string;
//         size :number;
//         shown? :boolean;
//         label? :string;
//         label_color? :any;
//         label_position_x? :number;
//         label_position_y? :number;
//         label_shown? :boolean;
//         label_size? :number;
//     }

//     interface PlotDataTitle
//     {
//         "0": PlotDataTitlePage;
//     }

//     interface PlotDataTitlePage
//     {
//         text :string[];
//     }

// // ----------------------------------------------------------------------

//     interface PopupMenuDescItem
//     {
//         label? :string;             // no label --> divider
//         icon? :string;
//         title? :boolean;             // cannot be selected
//         event? :string;               // event to trigger
//         eventNode? :JQuery | TriggeringEvent;           // node to trigger event on (default is popup menu parent)
//         eventData? :any;
//     }

//     type Position3d = number[]; //[number, number, number];

//     interface ObjectState
//     {
//         position :Position3d;
//         scale :number;
//         user_data? :any;
//         aspect? :number;
//         rotation? :number;
//         shape :string;
//         outline_width? :number;
//         fill_color :string;
//         fill_opacity? :number;
//         outline_color? :string;
//     }

//     // Complete set of data allowing to re-create level-1 widget in
//     // the same state (position of camera, object scale, etc.)
//     interface MapStateForDrawing
//     {
//         camera_position :Position3d;
//         camera_looking_at :Position3d;
//         camera_fov? :number;
//         number_of_dimensions :number;
//         objects :ObjectState[];
//         diameter :number;
//         center :Position3d;
//     }

// // ----------------------------------------------------------------------

//     interface MapWidget {
//         make_widget(container :any /*JQuery*/, size :number, plot_data :PlotDataInterface|MapStateForDrawing, extra_popup_menu_items? :PopupMenuDescItem[]) :MapWidgetLevel2;
//         widget_state(widget :MapWidgetLevel2) :MapStateForDrawing;
//         widget_restore(widget :MapWidgetLevel2, state :MapStateForDrawing) :void;
//     }

// ----------------------------------------------------------------------

} // module AntigenicMapViewer
