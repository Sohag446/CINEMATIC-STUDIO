use serde::Serialize;
use sysinfo::{Pid, System};
use std::sync::Mutex;

#[derive(Debug, Serialize, Clone)]
pub struct TelemetryData {
    pub app_process_memory_mb: u64,
    pub total_system_memory_mb: u64,
    pub used_system_memory_mb: u64,
    pub memory_percent: u8,
    pub cpu_percent: f32,
    pub active_tasks_count: usize,
    pub active_project_id: Option<String>,
    pub active_project_name: Option<String>,
    pub is_memory_pressure: bool,
}

pub struct TelemetryCollector {
    sys: Mutex<System>,
    pid: Pid,
}

impl TelemetryCollector {
    pub fn new() -> Self {
        let mut sys = System::new_all();
        sys.refresh_all();
        let pid = Pid::from_u32(std::process::id());
        Self {
            sys: Mutex::new(sys),
            pid,
        }
    }

    pub fn sample(&self, active_project_id: Option<String>, active_project_name: Option<String>, active_tasks: usize) -> TelemetryData {
        let mut sys = self.sys.lock().unwrap();
        sys.refresh_processes();
        sys.refresh_memory();
        sys.refresh_cpu();

        let total_ram_mb = sys.total_memory() / (1024 * 1024);
        let used_ram_mb = sys.used_memory() / (1024 * 1024);
        let mem_percent = if total_ram_mb > 0 {
            ((used_ram_mb as f64 / total_ram_mb as f64) * 100.0) as u8
        } else {
            0
        };

        let app_ram_mb = if let Some(proc) = sys.process(self.pid) {
            proc.memory() / (1024 * 1024)
        } else {
            0
        };

        let cpu_usage = sys.global_cpu_info().cpu_usage();

        TelemetryData {
            app_process_memory_mb: app_ram_mb,
            total_system_memory_mb: total_ram_mb,
            used_system_memory_mb: used_ram_mb,
            memory_percent: mem_percent,
            cpu_percent: cpu_usage,
            active_tasks_count: active_tasks,
            active_project_id,
            active_project_name,
            is_memory_pressure: mem_percent > 80,
        }
    }
}

