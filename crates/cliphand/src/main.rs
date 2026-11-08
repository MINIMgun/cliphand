use cliphand_core::greeting;

fn main() {
    let version = env!("CARGO_PKG_VERSION");
    let greeting = greeting(version);
    println!("{greeting}");
}
