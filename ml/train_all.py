"""Regenerates the synthetic data and retrains both models end to end."""

import generate_data
import pipelines

if __name__ == "__main__":
    generate_data.main()
    pipelines.run("GOVERNMENT")
    pipelines.run("BANK")
