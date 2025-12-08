import os
import sys
from cmdstanpy import install_cmdstan

def manual_install_v2():
    # Caminho base do RTools que você encontrou
    rtools_base = r"C:\Users\boier\.cmdstan\RTools40"
    
    # Precisamos destas DUAS pastas no PATH
    compiler_bin = os.path.join(rtools_base, "mingw64", "bin") # g++, make
    tools_bin = os.path.join(rtools_base, "usr", "bin")        # cp, cut, rm
    
    print(f"🎯 Configurando ambiente RTools completo...")
    
    # 1. Verifica se as pastas existem
    if not os.path.exists(compiler_bin):
        print(f"❌ Erro: Pasta do compilador não encontrada: {compiler_bin}")
        return
    if not os.path.exists(tools_bin):
        print(f"❌ Erro: Pasta de ferramentas não encontrada: {tools_bin}")
        return

    # 2. Injeta AS DUAS no PATH desta sessão
    # A ordem importa: ferramentas primeiro para garantir que o make ache o que precisa
    os.environ["PATH"] = tools_bin + os.pathsep + compiler_bin + os.pathsep + os.environ["PATH"]
    
    print(f"✅ PATH atualizado com sucesso.")
    print("🔧 Iniciando compilação do Prophet (CmdStan) com ferramentas Unix...")
    
    try:
        # overwrite=True força recriar do zero
        install_cmdstan(overwrite=True, verbose=True)
        print("\n" + "="*50)
        print("🎉 AGORA É REAL! SUCESSO TOTAL!")
        print("Pode rodar o teste de previsão.")
        print("="*50)
    except Exception as e:
        print(f"❌ Falha na compilação: {e}")

if __name__ == "__main__":
    manual_install_v2()