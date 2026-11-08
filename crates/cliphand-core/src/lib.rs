#[must_use]
pub fn greeting(version: &str) -> String {
    let hero = r"  ________      __                __
 / ___/ (_)__  / /  ___ ____  ___/ /
/ /__/ / / _ \/ _ \/ _ `/ _ \/ _  /
\___/_/_/ .__/_//_/\_,_/_//_/\_,_/
       /_/                          ";
    format!("{hero}\nVersion: {version}")
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_greeting() {
        let version = "1.0.0";
        let contains_version = greeting(version).contains(version);
        assert!(
            contains_version,
            "Greeting should contain the version string"
        );
    }
}
