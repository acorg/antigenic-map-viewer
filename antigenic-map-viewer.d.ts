// Type definitions for acmacs-plot-data module

declare module AntigenicMapViewer {

// ----------------------------------------------------------------------

    interface PlotDataInterface
    {
        diameter :number[];
        layout :PlotDataLayout;
        number_of_antigens :number;
        point_info :Object[];
        styles :PlotDataStyles;
    }

    type PlotDataLayout = number[][];

    interface PlotDataStyles
    {
        drawing_order :number[][];
        points :number[];
        styles :PlotDataStyle[];
    }

    interface PlotDataStyle
    {
        aspect :number;
        fill_color :string|any[];
        outline_color :string|any[];
        rotation :number;
        shape :string;
        size :number;
        shown :Boolean;
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
