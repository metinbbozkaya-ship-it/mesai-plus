import React from 'react';
import type { WidgetTaskHandlerProps } from 'react-native-android-widget';
import { MesaiWidget } from './MesaiWidget';
import { loadWidgetData } from './widgetSync';

const nameToWidget = {
  Mesai: MesaiWidget,
};

export async function widgetTaskHandler(props: WidgetTaskHandlerProps) {
  const widgetInfo = props.widgetInfo;
  const Widget = (nameToWidget as any)[widgetInfo.widgetName];
  if (!Widget) return;
  const data = await loadWidgetData();
  switch (props.widgetAction) {
    case 'WIDGET_ADDED':
    case 'WIDGET_UPDATE':
    case 'WIDGET_RESIZED':
      props.renderWidget(<Widget {...data} />);
      break;
    default:
      break;
  }
}
