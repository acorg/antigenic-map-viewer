// Type definitions for acmacs-plot-data module

declare module AntigenicMapViewer {

// ----------------------------------------------------------------------

    interface PlotDataInterface
    {
        version :number;
        diameter? :number[];
        layout :PlotDataLayout;
        number_of_antigens? :number;
        point_info :Object[];
        styles :PlotDataStyles;
        title? :PlotDataTitle;
        viewport_size? :[number, number];
        viewport_origin? :[number, number];
        transformation? :PlotDataTransformation; //  [[1.0, 0.0], [0.0, 1.0]]
    }

    type PlotDataLayout = number[][];

    type PlotDataTransformation = [[number, number], [number, number]];

    interface PlotDataStyles
    {
        drawing_order? :number[][];
        points :number[];
        styles :PlotDataStyle[];
    }

    interface PlotDataStyle
    {
        aspect? :number;
        fill_color :string|any[];
        outline_color :string|any[];
        outline_width? :number;
        rotation? :number;
        shape :string;
        size :number;
        shown? :Boolean;
    }

    interface PlotDataTitle
    {
        "0": PlotDataTitlePage;
    }

    interface PlotDataTitlePage
    {
        text :string[];
    }

// ----------------------------------------------------------------------

    interface TriggeringEvent {
        trigger(event :string, data :any) :void;
        on(event :string, callback: (data :any) => void) :JQuery;
    }

// ----------------------------------------------------------------------

    interface PopupMenuDescItem
    {
        label? :string;             // no label --> divider
        icon? :string;
        title? :Boolean;             // cannot be selected
        event? :string;               // event to trigger
        eventNode? :JQuery | TriggeringEvent;           // node to trigger event on (default is popup menu parent)
        eventData? :any;
    }

    interface MapWidgetLevel2 extends TriggeringEvent
    {
        destroy() :void;
        plot_data(plot_data :PlotDataInterface) :void;
        add_popup_menu_items(items :PopupMenuDescItem[]) :void;
        state_for_drawing() :MapStateForDrawing;
    }

    interface MapWidgetLevel2Maker {
        make_widget(container :any /*JQuery*/, size :number, plot_data :PlotDataInterface|MapStateForDrawing, extra_popup_menu_items? :PopupMenuDescItem[]) :MapWidgetLevel2;
    }

// ----------------------------------------------------------------------

    type Position3d = number[]; //[number, number, number];

    interface Object3d
    {
        position :Position3d;
        scale :number;
        user_data? :any;
        aspect? :number;
        rotation? :number;
        shape :string;
        outline_width? :number;
        fill_color :string;
        outline_color? :string;
    }

    // Complete set of data allowing to re-create level-1 widget in
    // the same state (position of camera, object scale, etc.)
    interface MapStateForDrawing
    {
        camera_position :Position3d;
        camera_looking_at :Position3d;
        camera_fov :number;
        number_of_dimensions :number;
        objects :Object3d[];
        diameter :number;
        center :Position3d;
    }

// ----------------------------------------------------------------------

} // module AntigenicMapViewer
