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

    interface MapWidgetLevel2
    {
        destroy() :void;
        plot_data(plot_data :PlotDataInterface) :void;
    }


    interface MapWidgetLevel2Maker {
        make_widget(container :any /*JQuery*/, size :number, plot_data :PlotDataInterface) :MapWidgetLevel2;
    }

// ----------------------------------------------------------------------

}                               // module AntigenicMapViewer
