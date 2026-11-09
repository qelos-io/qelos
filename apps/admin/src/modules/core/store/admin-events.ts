import eventsService from '@/services/apis/events-service';
import { useDispatcher } from '@/modules/core/compositions/dispatcher';
import { computed, ref } from 'vue';
import { defineStore } from 'pinia';
import { useWsConfiguration } from '@/modules/configurations/store/ws-configuration';

export interface IEvent {
  _id: string;
  tenant: string;
  user?: string;
  source: string;
  kind: string;
  eventName: string;
  description: string;
  created: string;
}

export const useAdminEvents = defineStore('adminEvents', () => {

// Activity chart configuration
const activityTimeframe = ref('week');

  // Authentication events (failed social logins)
  const { result: authEvents } = useDispatcher(() => eventsService.getAll({
    period: 'last-week',
    kind: 'failed-social-login',
    source: 'auth'
  }))

  // Storage connection error events
  const { result: storageEvents } = useDispatcher(() => eventsService.getAll({
    period: 'last-week',
    kind: 'storage-connection-error',
    source: 'assets'
  }))

  // User registration events for different time periods
  const { result: registeredUsersLastDay } = useDispatcher(() => eventsService.getAll({
    period: 'last-day',
    kind: 'signup',
    eventName: 'user-registered',
    source: 'auth'
  }))

  const { result: registeredUsersLastWeek } = useDispatcher(() => eventsService.getAll({
    period: 'last-week',
    kind: 'signup',
    eventName: 'user-registered',
    source: 'auth'
  }))

  const { result: registeredUsersLastMonth } = useDispatcher(() => eventsService.getAll({
    period: 'last-month',
    kind: 'signup',
    eventName: 'user-registered',
    source: 'auth'
  }))

  // User creation events for different time periods
  const { result: createdUsersLastDay } = useDispatcher(() => eventsService.getAll({
    period: 'last-day',
    kind: 'users',
    eventName: 'user-created',
    source: 'auth'
  }))

  const { result: createdUsersLastWeek } = useDispatcher(() => eventsService.getAll({
    period: 'last-week',
    kind: 'users',
    eventName: 'user-created',
    source: 'auth'
  }))

  const { result: createdUsersLastMonth } = useDispatcher(() => eventsService.getAll({
    period: 'last-month',
    kind: 'users',
    eventName: 'user-created',
    source: 'auth'
  }))
  
  const { result: createdWorkspacesLastDay } = useDispatcher(() => eventsService.getAll({
    period: 'last-day',
    kind: 'workspaces',
    eventName: 'workspace-created',
    source: 'auth'
  }))

  const { result: createdWorkspacesLastWeek, retry: loadCreatedWorkspacesLastWeek } = useDispatcher(() => eventsService.getAll({
    period: 'last-week',
    kind: 'workspaces',
    eventName: 'workspace-created',
    source: 'auth'
  }), null, true)

  const { result: createdWorkspacesLastMonth, retry: loadCreatedWorkspacesLastMonth } = useDispatcher(() => eventsService.getAll({
    period: 'last-month',
    kind: 'workspaces',
    eventName: 'workspace-created',
    source: 'auth'
  }), null, true)

  const wsConfig = useWsConfiguration();
  if (wsConfig.isActive) {
    loadCreatedWorkspacesLastWeek();
    loadCreatedWorkspacesLastMonth();
  }
  

  // System status based on events
  const systemStatus = computed(() => {
    return [
      { 
        name: 'Authentication', 
        status: (authEvents.value?.events?.length || 0) > 0 ? 'degraded' : 'operational', 
        icon: ['fas', 'shield-alt']
      },
      { 
        name: 'Storage',
        status: (storageEvents.value?.events?.length || 0) > 0 ? 'degraded' : 'operational', 
        icon: ['fas', 'hdd']
      }
    ]
  })

  // Activity chart data based on real events
  const activityChartOption = computed(() => {
    // Process events data for different timeframes
    // Buckets are rolling windows ending now, so they line up with the "last-day/week/month" queries
    const HOUR = 60 * 60 * 1000;
    const DAY = 24 * HOUR;
    const bucketConfig: Record<string, { count: number; size: number; label: (d: Date) => string }> = {
      day: { count: 6, size: 4 * HOUR, label: (d) => d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) },
      week: { count: 7, size: DAY, label: (d) => d.toLocaleDateString([], { weekday: 'short' }) },
      month: { count: 5, size: 6 * DAY, label: (d) => d.toLocaleDateString([], { month: 'short', day: 'numeric' }) },
    };

    const processEventsForTimeframe = (registeredUsers: IEvent[] = [], createdUsers: IEvent[] = [], createdWorkspaces: IEvent[] = [], timeframe: string) => {
      const { count, size, label } = bucketConfig[timeframe] || bucketConfig.week;
      const now = Date.now();
      const start = now - count * size;
      const xAxis = Array.from({ length: count }, (_, i) => label(new Date(start + i * size)));
      const countEvents = (events: IEvent[] = []) => {
        const counts = new Array(count).fill(0);
        for (const event of events) {
          const index = Math.floor((new Date(event.created).getTime() - start) / size);
          if (index >= 0 && index < count) counts[index]++;
        }
        return counts;
      };
      return {
        xAxis,
        registered: countEvents(registeredUsers),
        created: countEvents(createdUsers),
        createdWorkspaces: countEvents(createdWorkspaces),
      };
    };

    const getEventsForTimeframe = () => {
      if (activityTimeframe.value === 'day') {
        return {
          registered: registeredUsersLastDay.value?.events || [],
          created: createdUsersLastDay.value?.events || [],
          workspaces: createdWorkspacesLastDay.value?.events || []
        };
      }

      if (activityTimeframe.value === 'week') {
        return {
          registered: registeredUsersLastWeek.value?.events || [],
          created: createdUsersLastWeek.value?.events || [],
          workspaces: createdWorkspacesLastWeek.value?.events || []
        };
      }

      return {
        registered: registeredUsersLastMonth.value?.events || [],
        created: createdUsersLastMonth.value?.events || [],
        workspaces: createdWorkspacesLastMonth.value?.events || []
      };
    };
    
    // Process data for the current timeframe
    const events = getEventsForTimeframe();
    const data = processEventsForTimeframe(
      events.registered,
      events.created,
      events.workspaces,
      activityTimeframe.value
    );
    
    // Define series based on workspace configuration
    const seriesData = [
      {
        name: 'User Registrations',
        type: 'line',
        data: data.registered,
        smooth: true,
        lineStyle: {
          width: 3,
          color: '#5266d4'
        },
        itemStyle: {
          color: '#5266d4'
        }
      },
      {
        name: 'User Creations',
        type: 'line',
        data: data.created,
        smooth: true,
        lineStyle: {
          width: 3,
          color: '#2bcbd1'
        },
        itemStyle: {
          color: '#2bcbd1'
        }
      }
    ];

    // Only add workspace series if workspaces are active
    if (wsConfig.isActive) {
      seriesData.push({
        name: 'Workspace Creations',
        type: 'line',
        data: data.createdWorkspaces,
        smooth: true,
        lineStyle: {
          width: 3,
          color: '#f56c6c'
        },
        itemStyle: {
          color: '#f56c6c'
        }
      });
    }

    // Define legend data based on workspace configuration
    const legendData = ['User Registrations', 'User Creations'];
    if (wsConfig.isActive) {
      legendData.push('Workspace Creations');
    }

    // Return chart configuration that matches VChart format
    return {
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'shadow'
        }
      },
      legend: {
        data: legendData
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '3%',
        containLabel: true
      },
      xAxis: [
        {
          type: 'category',
          data: data.xAxis,
          axisTick: {
            alignWithLabel: true
          }
        }
      ],
      yAxis: [
        {
          type: 'value',
          name: 'Amount',
          nameLocation: 'middle',
          nameGap: 40
        }
      ],
      series: seriesData
    };
  })
  
  return {
    authEvents,
    storageEvents,
    registeredUsersLastDay,
    registeredUsersLastWeek,
    registeredUsersLastMonth,
    createdUsersLastDay,
    createdUsersLastWeek,
    createdUsersLastMonth,
    systemStatus,
    activityChartOption,
    activityTimeframe
  }
})