import eventsService from '@/services/events-service';
import { useDispatcher } from '@/modules/core/compositions/dispatcher';
import { computed, ref } from 'vue';
import { defineStore } from 'pinia';

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

  const { result: createdWorkspacesLastWeek } = useDispatcher(() => eventsService.getAll({
    period: 'last-week',
    kind: 'workspaces',
    eventName: 'workspace-created',
    source: 'auth'
  }))

  const { result: createdWorkspacesLastMonth } = useDispatcher(() => eventsService.getAll({
    period: 'last-month',
    kind: 'workspaces',
    eventName: 'workspace-created',
    source: 'auth'
  }))
  

  // System status based on events
  const systemStatus = computed(() => {
    return [
      { 
        name: 'Authentication', 
        status: authEvents.value?.length > 0 ? 'degraded' : 'operational', 
        icon: ['fas', 'shield-alt']
      },
      { 
        name: 'Storage',
        status: storageEvents.value?.length > 0 ? 'degraded' : 'operational', 
        icon: ['fas', 'hdd']
      }
    ]
  })

  // Activity chart data based on real events
  const activityChartOption = computed(() => {
    // Process events data for different timeframes
    const processEventsForTimeframe = (registeredUsers: IEvent[] = [], createdUsers: IEvent[] = [], createdWorkspaces: IEvent[] = [], timeframe: string) => {
      if (!registeredUsers && !createdUsers && !createdWorkspaces) return { xAxis: [], registered: [], created: [], createdWorkspaces: [] };
      
      let xAxis: string[] = [];
      let registeredCounts: number[] = [];
      let createdCounts: number[] = [];
      let createdWorkspacesCounts: number[] = [];
      
      if (timeframe === 'day') {
        // Group by hours for 24-hour view
        xAxis = ['00:00', '04:00', '08:00', '12:00', '16:00', '20:00'];
        const hourRanges = [0, 4, 8, 12, 16, 20];
        
        registeredCounts = hourRanges.map(startHour => {
          const endHour = startHour + 4;
          return registeredUsers?.filter(event => {
            const hour = new Date(event.created).getHours();
            return hour >= startHour && hour < endHour;
          }).length || 0;
        });
        
        createdCounts = hourRanges.map(startHour => {
          const endHour = startHour + 4;
          return createdUsers?.filter(event => {
            const hour = new Date(event.created).getHours();
            return hour >= startHour && hour < endHour;
          }).length || 0;
        });

        createdWorkspacesCounts = hourRanges.map(startHour => {
          const endHour = startHour + 4;
          return createdWorkspaces?.filter(event => {
            const hour = new Date(event.created).getHours();
            return hour >= startHour && hour < endHour;
          }).length || 0;
        });
      } 
      else if (timeframe === 'week') {
        // Group by days of the week
        xAxis = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
        
        registeredCounts = [0, 1, 2, 3, 4, 5, 6].map(dayIndex => {
          return registeredUsers?.filter(event => {
            const day = new Date(event.created).getDay();
            // Convert from Sunday=0 to Monday=0 format
            const adjustedDay = day === 0 ? 6 : day - 1;
            return adjustedDay === dayIndex;
          }).length || 0;
        });
        
        createdCounts = [0, 1, 2, 3, 4, 5, 6].map(dayIndex => {
          return createdUsers?.filter(event => {
            const day = new Date(event.created).getDay();
            // Convert from Sunday=0 to Monday=0 format
            const adjustedDay = day === 0 ? 6 : day - 1;
            return adjustedDay === dayIndex;
          }).length || 0;
        });
      } 
      else if (timeframe === 'month') {
        // Group by weeks of the month
        xAxis = ['Week 1', 'Week 2', 'Week 3', 'Week 4'];
        
        registeredCounts = [0, 1, 2, 3].map(weekIndex => {
          return registeredUsers?.filter(event => {
            const date = new Date(event.created);
            const dayOfMonth = date.getDate();
            // Approximate week based on day of month
            const week = Math.floor((dayOfMonth - 1) / 7);
            return week === weekIndex;
          }).length || 0;
        });
        
        createdCounts = [0, 1, 2, 3].map(weekIndex => {
          return createdUsers?.filter(event => {
            const date = new Date(event.created);
            const dayOfMonth = date.getDate();
            // Approximate week based on day of month
            const week = Math.floor((dayOfMonth - 1) / 7);
            return week === weekIndex;
          }).length || 0;
        });
      }
      
      return { xAxis, registered: registeredCounts, created: createdCounts, createdWorkspaces: createdWorkspacesCounts };
    };
    
    // Process data for the current timeframe
    const data = processEventsForTimeframe(
      activityTimeframe.value === 'day' ? registeredUsersLastDay.value : 
      activityTimeframe.value === 'week' ? registeredUsersLastWeek.value : 
      registeredUsersLastMonth.value,
      activityTimeframe.value === 'day' ? createdUsersLastDay.value : 
      activityTimeframe.value === 'week' ? createdUsersLastWeek.value : 
      createdUsersLastMonth.value,
      activityTimeframe.value === 'day' ? createdWorkspacesLastDay.value : 
      activityTimeframe.value === 'week' ? createdWorkspacesLastWeek.value : 
      createdWorkspacesLastMonth.value,
      activityTimeframe.value
    );
    
    // Return chart configuration that matches VChart format
    return {
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'shadow'
        }
      },
      legend: {
        data: ['User Registrations', 'User Creations', 'Workspace Creations']
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
      series: [
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
        },
        {
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
        }
      ]
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