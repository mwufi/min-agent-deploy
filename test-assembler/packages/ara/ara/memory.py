
def print_working_directory():
    import os
    print(os.getcwd())
    
class Memory:
    def __init__(self):
        print("Memory initialized!")
        print_working_directory()
        
    def testitout(self):
        print("Testing it out! Hot reload is working!!! we have a new change!")