use cliphand_core::greeting;
use std::io::{IsTerminal, stderr};
use tracing::{Level, info, level_filters::LevelFilter, span, warn};
use tracing_subscriber::EnvFilter;

fn main() {
    configure_logging();
    let version = env!("CARGO_PKG_VERSION");
    let greeting = greeting(version);
    println!("{greeting}");

    let _span = span!(Level::INFO, "main", version).entered();
    info!("cliphand is starting");
    warn!("nothing implemented yet");
}

fn configure_logging() {
    let filter = EnvFilter::builder()
        .with_default_directive(LevelFilter::INFO.into())
        .from_env_lossy();

    tracing_subscriber::fmt()
        .with_env_filter(filter)
        .with_ansi(stderr().is_terminal())
        .with_writer(stderr)
        .init();
}
