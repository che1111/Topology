import * as React from 'react';
import {
  GraphElement,
  ComponentFactory,
  withContextMenu,
  ContextMenuSeparator,
  ContextMenuItem,
  withDragNode,
  withSelection,
  ModelKind,
  DragObjectWithType,
  Node,
  withPanZoom,
  GraphComponent,
  withCreateConnector,
  Graph,
  isNode,
  withDndDrop,
  Edge,
  withTargetDrag,
  withSourceDrag,
  nodeDragSourceSpec,
  nodeDropTargetSpec,
  groupDropTargetSpec,
  graphDropTargetSpec,
  NODE_DRAG_TYPE,
  CREATE_CONNECTOR_DROP_TYPE,
  NodeStatus
} from '@patternfly/react-topology';
import StyleNode from './StyleNode';
import StyleGroup from './StyleGroup';
import StyleEdge from './StyleEdge';
import CustomPathNode from '../../components/CustomPathNode';
import CustomPolygonNode from '../../components/CustomPolygonNode';

import deviceAlarms from './samplealarm.json';

const CONNECTOR_SOURCE_DROP = 'connector-src-drop';
const CONNECTOR_TARGET_DROP = 'connector-target-drop';

interface EdgeProps {
  element: Edge;
}

// Function to fetch a new token before sending an alarm
const fetchToken = async (): Promise<string | null> => {
  try {
    const response = await fetch('http://172.20.3.81:8888/users/auth', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Basic bWFubzoxMjM0NTZhQEE='
      },
      body: JSON.stringify({
        grant_type: 'client_credentials'
      })
    });

    if (!response.ok) {
      throw new Error(`Token fetch failed with status: ${response.status}`);
    }

    const data = await response.json();
    return data.access_token; // Assuming the token is in `access_token`
  } catch (error) {
    console.error('Error fetching token:', error);
    return null;
  }
};

// Function to send POST request
const sendPostRequest = async (alarmData: any) => {
  const token = await fetchToken(); // Fetch the token before sending the request
  if (!token) {
    console.error('Token is not available, unable to send POST request');
    return;
  }

  try {
    const response = await fetch('http://172.20.3.81:8888/extended-fm/v1/receives', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(alarmData)
    });

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const result = await response.json();
    console.log('POST request successful:', result);
  } catch (error) {
    console.error('Error sending POST request:', error);
  }
};

// Function to create context menu items
const contextMenuItem = (label: string, i: number, element: Node): React.ReactElement => {
  const deviceAlarm = deviceAlarms.find((alarm) => alarm.deviceName === element.getData().label);
  if (!deviceAlarm) {
    return (
      <ContextMenuItem key={`no-alarm-${i}`} disabled>
        No Alarm Available
      </ContextMenuItem>
    );
  }

  return (
    <ContextMenuItem
      key={label}
      onClick={async () => {
        const now = new Date().toISOString();
        let alarmData;

        if (label === 'Send Alarm') {
          element.setNodeStatus(NodeStatus.danger);
          deviceAlarm.alarm.alarm.alarmChangedTime = now;
          deviceAlarm.alarm.alarm.eventTime = now;
          alarmData = deviceAlarm.alarm;
        } else if (label === 'Resolve Alarm') {
          element.setNodeStatus(NodeStatus.success);
          deviceAlarm.resolve_alarm.alarm.alarmChangedTime = now;
          deviceAlarm.resolve_alarm.alarm.eventTime = now;
          alarmData = deviceAlarm.resolve_alarm;
        }

        console.log('Sending alarm data:', alarmData);
        await sendPostRequest(alarmData); // Send alarm data with token
      }}
    >
      {label}
    </ContextMenuItem>
  );
};

// Function to create the context menu
const createContextMenuItems = (element: Node): React.ReactElement[] => {
  return [contextMenuItem('Send Alarm', 1, element), contextMenuItem('Resolve Alarm', 2, element)];
};

// Functional component to manage node status
const NodeWithContextMenu: React.FC<{ element: Node }> = ({ element }) => {
  return <>{createContextMenuItems(element)}</>;
};

// Component factory for styling and behavior
const stylesComponentFactory: ComponentFactory = (
  kind: ModelKind,
  type: string
): React.ComponentType<{ element: GraphElement }> | undefined => {
  if (kind === ModelKind.graph) {
    return withDndDrop(graphDropTargetSpec([NODE_DRAG_TYPE]))(withPanZoom()(GraphComponent));
  }
  switch (type) {
    case 'node':
      return withCreateConnector((source: Node, target: Node | Graph): void => {
        let targetId;
        const model = source.getController().toModel();
        if (isNode(target)) {
          targetId = target.getId();
        } else {
          return;
        }
        const id = `e${source.getGraph().getEdges().length + 1}`;
        if (!model.edges) {
          model.edges = [];
        }
        model.edges.push({
          id,
          type: 'edge',
          source: source.getId(),
          target: targetId
        });
        source.getController().fromModel(model);
      })(
        withDndDrop(nodeDropTargetSpec([CONNECTOR_SOURCE_DROP, CONNECTOR_TARGET_DROP, CREATE_CONNECTOR_DROP_TYPE]))(
          withContextMenu((element: GraphElement) => {
            // Check if the GraphElement is a Node
            if (isNode(element)) {
              // Use the functional component to manage state and context menu
              return <NodeWithContextMenu element={element as Node} />;
            }
            return [];
          })(withDragNode(nodeDragSourceSpec('node', true, true))(withSelection()(StyleNode)))
        )
      );
    case 'node-path':
      return CustomPathNode;
    case 'node-polygon':
      return CustomPolygonNode;
    case 'group':
      return withDndDrop(groupDropTargetSpec)(
        withContextMenu(() => createContextMenuItems(() => {}))(
          withDragNode(nodeDragSourceSpec('group'))(withSelection()(StyleGroup))
        )
      );
    case 'edge':
      return withSourceDrag<DragObjectWithType, Node, any, EdgeProps>({
        item: { type: CONNECTOR_SOURCE_DROP },
        begin: (monitor, props) => {
          props.element.raise();
          return props.element;
        },
        drag: (event, monitor, props) => {
          props.element.setStartPoint(event.x, event.y);
        },
        end: (dropResult, monitor, props) => {
          if (monitor.didDrop() && dropResult && props) {
            props.element.setSource(dropResult);
          }
          props.element.setStartPoint();
        }
      })(
        withTargetDrag<DragObjectWithType, Node, { dragging?: boolean }, EdgeProps>({
          item: { type: CONNECTOR_TARGET_DROP },
          begin: (monitor, props) => {
            props.element.raise();
            return props.element;
          },
          drag: (event, monitor, props) => {
            props.element.setEndPoint(event.x, event.y);
          },
          end: (dropResult, monitor, props) => {
            if (monitor.didDrop() && dropResult && props) {
              props.element.setTarget(dropResult);
            }
            props.element.setEndPoint();
          },
          collect: (monitor) => ({
            dragging: monitor.isDragging()
          })
        })(withContextMenu(() => createContextMenuItems(() => {}))(withSelection()(StyleEdge)))
      );
    default:
      return undefined;
  }
};

export default stylesComponentFactory;
